import type { GitChangelogPluginTypes } from 'constants.ts';
import type { ObsidianGitPlugin } from 'gitPluginTypes.ts';
import type { Debouncer } from 'obsidian';
import type { ExtractPluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginTypesBase';
import type { GitChangelogSettings } from 'settings/settings.ts';
import type { SimpleGit } from 'simple-git';
import type { ReadonlyDeep } from 'type-fest';

import {
  COMPARE_REPO_COMMITS_VIEW_CONFIG,
  COMPARE_TO_CHECKPOINT_VIEW_CONFIG
} from 'constants.ts';
import { FileChangelogManager } from 'core/FileChangelogManager.ts';
import { getCommitTimestampOrUndefined } from 'core/gitOperations/getCommitTimestamp.ts';
import { runHashObjectEmptyTree } from 'core/gitOperations/runHashObjectEmptyTree.ts';
import { changelogGenerationSettingsChanged } from 'core/helper.ts';
import { VaultChangelogManager } from 'core/VaultChangelogManager.ts';
import { addContextMenuItems } from 'menu.ts';
import { debounce, ItemView, Notice } from 'obsidian';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';
import { GitChangelogSettingsManager } from 'settings/settingsManager.ts';
import { getLocaleToAssign } from 'settings/ui/CustomLocale.ts';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import {
  gitPluginCompatibleVersion,
  gitPluginTestedVersion
} from 'settings/ui/GitPluginWarning.ts';
import spacetime from 'spacetime';
import { TaskManager } from 'TaskManager.svelte.ts';
import { formatDateHour } from 'timeUtils.ts';
import { assertNotNull, removeCompareVersionsView } from 'utils.ts';
import { CompareRepoCommitsView } from 'Views/CompareRepoCommits/CompareRepoCommits.ts';
import { CompareToCheckpointView } from 'Views/CompareToCheckpoint/CompareToCheckpoint.ts';
import {
  FILE_CHANGELOG_VIEW_CONFIG,
  FileChangelogView
} from 'Views/FileChangelog/FileChangelog.ts';
import { getActiveGitRelativeFile, isDiffView } from 'Views/helper.ts';
import {
  VAULT_CHANGELOG_VIEW_CONFIG,
  VaultChangelogView
} from 'Views/VaultChangelog/VaultChangelog.ts';

import { addCommands } from './commands.ts';
import { GitChangelogSettingsTab } from './settings/settingsTab.ts';
import { StatusBarStats } from './statusBar.ts';
import {
  GitPluginIncompatibleVersionError,
  GitPluginMissingError,
  GitPluginState,
  GitRepoMissingError
} from './types.ts';

export class GitChangelogPlugin extends PluginBase<GitChangelogPluginTypes> {
  public debouncedChangelogSettingsChangedCheck:
    | Debouncer<
        [
          oldSettings: ReadonlyDeep<
            ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
          >,
          newSettings: ReadonlyDeep<
            ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
          >
        ],
        void
      >
    | undefined;

  public gitPluginState = $state<GitPluginState>();
  public gitRepoReady = $state<boolean>();
  // Used for keeping relative interval labels like "today" and "yesterday" up to date
  public dependenciesReady = $derived(
    (this.gitPluginState === GitPluginState.Enabled ||
      this.gitPluginState === GitPluginState.UntestedVersion) &&
      this.gitRepoReady
  );

  public detectedTimeZone: string | undefined;
  public detectedLocale: string | undefined;
  public utcCurrentDateHour = $state<string>(
    formatDateHour(spacetime.now('utc'))
  ); // In UTC so it doesn't depend on the timezone setting

  public vaultChangelogManager = $state<VaultChangelogManager>();
  public fileChangelogManager = $state<FileChangelogManager>();
  public statusBarStats?: StatusBarStats;
  public cachedActiveGitFile: string | undefined;
  public compareVersionsNewerDate: string | undefined;
  public compareVersionsOlderDate: string | undefined;

  public localeSafe = $state<string>('en-US'); // Properly loaded in onLayoutReady

  public get emptyTreeHashUnsafe(): string {
    return assertNotNull(this.emptyTreeHash);
  }

  /**
   * If we were to persist this, it would be less flexible if the user changes his repo or the hashing algorithm and we would need to either manually have a database of all possible empty tree hashes or validate it in runtime
   */
  private emptyTreeHash: string | undefined;

  public async addFileChangelogView(): Promise<void> {
    await this.app.workspace.ensureSideLeaf(
      FILE_CHANGELOG_VIEW_CONFIG.type,
      'right',
      { reveal: false }
    );
  }

  public async addVaultChangelogView(): Promise<void> {
    await this.app.workspace.ensureSideLeaf(
      VAULT_CHANGELOG_VIEW_CONFIG.type,
      'left',
      { reveal: false }
    );
  }

  public initStatusBar(): void {
    const statusBarElement = this.addStatusBarItem();
    this.statusBarStats = new StatusBarStats(
      statusBarElement,
      this,
      new TaskManager(this)
    );
  }

  // eslint-disable-next-line no-magic-numbers
  public displayError(data: unknown, timeout: number = 10 * 1000): void {
    const error: Error = data instanceof Error ? data : new Error(String(data));

    new Notice(`${this.manifest.name}\nError: ${error.message}`, timeout);
    this.consoleDebug(`Error:`, error.stack);
  }

  public displayNotice(
    message: DocumentFragment | string,
    // eslint-disable-next-line no-magic-numbers
    timeout: number = 3 * 1000
  ): void {
    if (message instanceof DocumentFragment) {
      new Notice(message, timeout);
      return;
    }

    new Notice(`${this.manifest.name}:\n${message}`, timeout);
  }

  public async getGit(): Promise<SimpleGit> {
    const gitPlugin = this.getGitPlugin();
    if (await gitPlugin.isAllInitialized()) {
      this.gitRepoReady = true;
      return gitPlugin.gitManager.git;
    }
    this.gitRepoReady = false;
    throw new GitRepoMissingError();
  }

  public getGitPlugin(): ObsidianGitPlugin {
    const gitPlugin = this.app.plugins.getPlugin('obsidian-git');
    if (gitPlugin) {
      if (gitPluginCompatibleVersion(gitPlugin as ObsidianGitPlugin)) {
        this.gitPluginState = gitPluginTestedVersion(
          gitPlugin as ObsidianGitPlugin
        )
          ? GitPluginState.Enabled
          : GitPluginState.UntestedVersion;

        return gitPlugin as ObsidianGitPlugin;
      }
      this.gitPluginState = GitPluginState.IncompatibleVersion;
      throw new GitPluginIncompatibleVersionError();
    } else {
      this.gitPluginState = GitPluginState.Uninitialized;
      this.gitRepoReady = false; // Not connected actually
      throw new GitPluginMissingError();
    }
  }

  public async getEmptyTreeHash(): Promise<string> {
    if (this.emptyTreeHash) {
      return this.emptyTreeHash;
    }
    const git = await this.getGit();
    const emptyTreeHash = await runHashObjectEmptyTree({ git });
    this.emptyTreeHash ??= emptyTreeHash;
    return this.emptyTreeHash;
  }

  // We only pass the relevant settings for checking because if some invalid value was changed to some other invalid value, that means the default value is used in both cases and we discard that change
  // eslint-disable-next-line @typescript-eslint/require-await
  public override async onSaveSettings(
    _newSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >,
    _oldSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >,
    skipCheck?: boolean
  ): Promise<void> {
    // If the local setting was modified externally, we need to update the localeSafe property.
    this.localeSafe = getLocaleToAssign(this);

    if (skipCheck === true) {
      return;
    }
    this.debouncedChangelogSettingsChangedCheck?.(_oldSettings, _newSettings);
  }

  protected override createSettingsTab(): GitChangelogSettingsTab {
    return new GitChangelogSettingsTab(this);
  }

  protected override createSettingsManager(): GitChangelogSettingsManager {
    return new GitChangelogSettingsManager(this);
  }

  // Runs when the plugin is unloaded.
  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async onunloadImpl(): Promise<void> {
    this.debouncedChangelogSettingsChangedCheck?.cancel();
    this.fileChangelogManager?.taskManager.abort();
    this.vaultChangelogManager?.taskManager.abort();
    this.statusBarStats?.destroy();
  }

  protected override async onloadImpl(): Promise<void> {
    await super.onloadImpl();
    this.registerView(VAULT_CHANGELOG_VIEW_CONFIG.type, (leaf) => {
      return new VaultChangelogView(leaf, this);
    });

    this.registerView(FILE_CHANGELOG_VIEW_CONFIG.type, (leaf) => {
      return new FileChangelogView(leaf, this);
    });

    this.registerView(COMPARE_TO_CHECKPOINT_VIEW_CONFIG.type, (leaf) => {
      return new CompareToCheckpointView(leaf, this);
    });

    this.registerView(COMPARE_REPO_COMMITS_VIEW_CONFIG.type, (leaf) => {
      return new CompareRepoCommitsView(
        leaf,
        this,
        assertNotNull(this.compareVersionsOlderDate),
        assertNotNull(this.compareVersionsNewerDate)
      );
    });

    addCommands(this);

    addContextMenuItems(this);

    this.debouncedChangelogSettingsChangedCheck = debounce(
      (
        oldSettings: ReadonlyDeep<
          ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
        >,
        newSettings: ReadonlyDeep<
          ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
        >
      ) => {
        this.onSaveSettingsCheck(oldSettings, newSettings);
      },
      // eslint-disable-next-line no-magic-numbers
      700,
      true
    );
  }

  protected override async onLayoutReady(): Promise<void> {
    // This is a temporary view, and shouldn't persist between sessions
    removeCompareVersionsView(this);

    this.localeSafe = getLocaleToAssign(this);

    // These have to be initiated first.
    this.vaultChangelogManager = new VaultChangelogManager({
      plugin: this,
      taskManager: new TaskManager(this)
    });
    this.fileChangelogManager = new FileChangelogManager({
      plugin: this,
      taskManager: new TaskManager(this)
    });

    if (this.settings.showStatusBarStats) {
      this.initStatusBar();
    }

    this.registerEvent(
      this.app.workspace.on('file-open', () => {
        this.updateActiveGitFile();
      })
    );

    // This will detect if the current open file was renamed after every commit.
    this.registerEvent(
      this.app.workspace.on('obsidian-git:head-change', () => {
        this.updateActiveGitFile();
      })
    );

    // Every  minute it checks if it's a new hour (most common interval) in order to update the potentially outdated interval labels.
    this.registerInterval(
      window.setInterval(
        () => {
          const utcCurrentDate = spacetime.now('utc');
          // Svelte triggers updates only if the strings are different.
          this.utcCurrentDateHour = formatDateHour(utcCurrentDate);
        },
        // eslint-disable-next-line no-magic-numbers
        60 * 1000
      )
    );

    // This.registerEvent(
    //   This.app.workspace.on('active-leaf-change', () => {
    //     This.clearActiveGitFileIfNoViewOpen();
    //   }),
    // );

    if (this.settings.firstStartup) {
      await this.addVaultChangelogView();
      await this.addFileChangelogView();

      await this.settingsManager.editAndSave(
        (settings: GitChangelogSettings): void => {
          settings.firstStartup = false;
        }
      );
    }

    // If there are no vault history checkpoints, initialize the first one.
    if (this.settings.checkpointCommits.length === 0) {
      const git = await this.getGit();

      const latestCommit = await getCommitTimestampOrUndefined({
        abortSignal: new AbortController().signal,
        git,
        timeZone: getTimeZone(this)
      });

      await this.settingsManager.editAndSave(
        (settings: GitChangelogSettings): void => {
          if (latestCommit && settings.checkpointCommits.length === 0) {
            settings.checkpointCommits.push(latestCommit.hash);
          }
        }
      );
    }

    // Also checks the status of the Git plugin
    this.updateActiveGitFile();
  }

  private setNewActiveGitFile(activeGitFile: string | undefined): void {
    this.fileChangelogManager?.resetAndGetSignal(); // Does this belong inside the file changelog class?
    this.cachedActiveGitFile = activeGitFile;
    this.app.workspace.trigger('git-changelog:active-git-file-changed');
  }

  private updateActiveGitFile(): void {
    // Trying to communicate with the Git plugin could throw an error.
    try {
      const currentActiveGitFile = getActiveGitRelativeFile(this);

      // This ordering doesn't react to opening the diff views.
      if (currentActiveGitFile === this.cachedActiveGitFile) {
        return;
      }

      if (currentActiveGitFile) {
        this.setNewActiveGitFile(currentActiveGitFile);
      } else {
        const currentActiveView =
          this.app.workspace.getActiveViewOfType(ItemView);

        // If a DiffView is active, don't clear the active git file, but keep it, so that the file changelog still shows stats for that previously active file. Only works if the diff view is also focused.
        if (isDiffView(currentActiveView)) {
          return;
        }

        this.setNewActiveGitFile(undefined);
      }
    } catch {
      /* Empty */
    }
  }

  /**
   * Triggers events for the views to listen to instead of updating the changelogs directly from the settings so that if the views aren't active we don't do unnecessary computation.
   * This allows us to check if relevant settings have changed and only then recompute changelogs, instead of recomputing after every single settings change.
   */
  private onSaveSettingsCheck(
    oldSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >,
    newSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >
  ): void {
    try {
      if (
        changelogGenerationSettingsChanged({
          newSettings,
          oldSettings
        })
      ) {
        // The main settings, that trigger recalculation for all stats when they change.
        this.app.workspace.trigger('git-changelog:generation-settings-changed');
        return;
      }

      if (
        this.fileChangelogManager?.specificSettingsChanged(
          oldSettings,
          newSettings
        ) &&
        this.cachedActiveGitFile
      ) {
        this.app.workspace.trigger(
          'git-changelog:file-changelog-generation-settings-changed'
        );
      }

      // Handle destroying and initializing the status bar stats
      if (this.settings.showStatusBarStats !== !!this.statusBarStats) {
        const shouldEnableStatusBarStats = this.settings.showStatusBarStats;
        if (shouldEnableStatusBarStats) {
          this.initStatusBar();
        } else {
          this.statusBarStats?.destroy?.();
          this.statusBarStats = undefined;
        }
      }
      // Handle status bar settings changes
      else if (
        this.statusBarStats &&
        StatusBarStats.generationSettingsChanged(oldSettings, newSettings) &&
        this.cachedActiveGitFile
      ) {
        this.app.workspace.trigger('git-changelog:status-bar-settings-changed');
      }

      if (
        this.vaultChangelogManager?.specificSettingsChanged(
          oldSettings,
          newSettings
        )
      ) {
        this.app.workspace.trigger(
          'git-changelog:vault-changelog-generation-settings-changed'
        );
      }
    } catch {
      /* Empty */
    }
  }
}
