import type { ObsidianGitPlugin } from 'gitPluginTypes.ts';
import type { Debouncer, PluginSettingTab } from 'obsidian';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { SimpleGit } from 'simple-git';
import type { ReadonlyDeep } from 'type-fest';

import { FileChangelogManager } from 'core/FileChangelogManager.ts';
import { VaultChangelogManager } from 'core/VaultChangelogManager.ts';
import { debounce, ItemView, Notice } from 'obsidian';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';
import { changelogGenerationSettingsChanged } from 'settings/helper.ts';
import { GitChangelogPluginSettings } from 'settings/settings.ts';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import {
  gitPluginCompatibleVersion,
  gitPluginTestedVersion
} from 'settings/ui/GitPluginWarning.ts';
import spacetime from 'spacetime';
import { TaskManager } from 'TaskManager.svelte.ts';
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
import { StatusBar } from './statusBar.ts';
import {
  GitPluginIncompatibleVersionError,
  GitPluginMissingError,
  GitPluginState,
  GitRepoMissingError
} from './types.ts';

export class GitChangelogPlugin extends PluginBase<GitChangelogPluginSettings> {
  public debouncedChangelogSettingsChangedCheck:
    | Debouncer<
        [
          oldSettings: ReadonlyDeep<GitChangelogPluginSettings>,
          newSettings: ReadonlyDeep<GitChangelogPluginSettings>
        ],
        void
      >
    | undefined;

  public gitPluginState = $state<GitPluginState>();
  public gitRepoReady = $state<boolean>();
  // Used for keeping relative interval labels like "today" and "yesterday" up to date
  public currentDay = $state<string>();
  public emptyTreeHash: string | undefined;

  public dependenciesReady = $derived(
    (this.gitPluginState === GitPluginState.Enabled ||
      this.gitPluginState === GitPluginState.UntestedVersion) &&
      this.gitRepoReady
  );

  public detectedTimeZone: string | undefined;
  public vaultChangelogManager = $state<VaultChangelogManager>();

  public fileChangelogManager = $state<FileChangelogManager>();
  public settingsOfComputedCache?: ChangelogGenerationSettings;
  public statusBar?: StatusBar;

  public cachedActiveGitFile: string | undefined;

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

  public assignStatusBar(): void {
    const statusBarElement = this.addStatusBarItem();
    this.statusBar = new StatusBar(
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

  // eslint-disable-next-line no-magic-numbers
  public displayNotice(message: string, timeout: number = 3 * 1000): void {
    new Notice(`${this.manifest.name}\n${message}`, timeout);
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

  public override async saveSettings(
    newSettings: GitChangelogPluginSettings,
    checkForChanges = true
  ): Promise<void> {
    const oldSettings = this.settings;
    await super.saveSettings(newSettings);
    if (checkForChanges) {
      this.debouncedChangelogSettingsChangedCheck?.(oldSettings, newSettings);
    }
  }

  protected override createPluginSettings(
    data: unknown
  ): GitChangelogPluginSettings {
    return new GitChangelogPluginSettings(data);
  }

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return new GitChangelogSettingsTab(this);
  }

  // Functions below are from obsidian-dev-utils (https://github.com/mnaoumov/obsidian-dev-utils/blob/main/src/obsidian/Plugin/PluginBase.ts)

  protected override onloadComplete(): void {
    // Runs when the plugin is unloaded.
    this.register(() => {
      this.debouncedChangelogSettingsChangedCheck?.cancel();
      this.fileChangelogManager?.taskManager.abort();
      this.vaultChangelogManager?.taskManager.abort();
      this.statusBar?.remove();
    });

    this.registerView(VAULT_CHANGELOG_VIEW_CONFIG.type, (leaf) => {
      return new VaultChangelogView(leaf, this);
    });

    this.registerView(FILE_CHANGELOG_VIEW_CONFIG.type, (leaf) => {
      return new FileChangelogView(leaf, this);
    });

    addCommands(this);

    this.debouncedChangelogSettingsChangedCheck = debounce(
      (
        oldSettings: GitChangelogPluginSettings,
        newSettings: GitChangelogPluginSettings
      ) => {
        this.onSettingsSave(oldSettings, newSettings);
      },
      // eslint-disable-next-line no-magic-numbers
      700,
      true
    );
  }

  protected override async onLayoutReady(): Promise<void> {
    // These have to be initiated first.
    this.vaultChangelogManager = new VaultChangelogManager({
      plugin: this,
      taskManager: new TaskManager(this)
    });
    this.fileChangelogManager = new FileChangelogManager({
      plugin: this,
      taskManager: new TaskManager(this)
    });

    if (this.settings.statusBarStats) {
      this.assignStatusBar();
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

    // Every 5 minutes it checks if it's a new day in order to update the potentially outdated interval labels.
    this.registerInterval(
      window.setInterval(
        () => {
          const timezone = getTimeZone(
            this.settings.changelogGenerationSettings,
            this
          );
          this.currentDay = spacetime.now(timezone).format('day');
        },
        // eslint-disable-next-line no-magic-numbers
        5 * 60 * 1000
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

      const newSettings = this.settingsClone;
      newSettings.firstStartup = false;
      await this.saveSettings(newSettings, false);
    }
    this.updateActiveGitFile();

    // Check status of the Git plugin
    this.getGitPlugin();
  }

  /**
   * Triggers events for the views to listen to instead of updating the changelogs directly from the settings so that if the views aren't active we don't do unnecessary computation.
   * This allows us to check if relevant settings have changed and only then recompute changelogs, instead of recomputing after every single settings change.
   */
  private onSettingsSave(
    oldSettings: GitChangelogPluginSettings,
    newSettings: GitChangelogPluginSettings
  ): void {
    if (
      changelogGenerationSettingsChanged({
        newChangelogSettings: newSettings.changelogGenerationSettings,
        oldChangelogSettings: oldSettings.changelogGenerationSettings,
        plugin: this
      })
    ) {
      // The main settings, that trigger recalculation for all stats when they change.
      this.app.workspace.trigger('git-changelog:generation-settings-changed');
    } else {
      if (
        this.fileChangelogManager?.generationSettingsChanged(
          oldSettings,
          newSettings
        ) &&
        this.cachedActiveGitFile
      ) {
        this.app.workspace.trigger(
          'git-changelog:file-changelog-generation-settings-changed'
        );
      }
      if (
        this.statusBar &&
        StatusBar.generationSettingsChanged(oldSettings, newSettings) &&
        this.cachedActiveGitFile
      ) {
        this.app.workspace.trigger('git-changelog:status-bar-settings-changed');
      }
      if (
        this.vaultChangelogManager?.generationSettingsChanged(
          oldSettings,
          newSettings
        )
      ) {
        this.app.workspace.trigger(
          'git-changelog:vault-changelog-generation-settings-changed'
        );
      }
    }
  }

  private setNewActiveGitFile(activeGitFile: string | undefined): void {
    this.fileChangelogManager?.resetAndGetSignal();
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

        // If a DiffView is active, don't clear the active git file, but keep it, so that the file changelog still shows stats for that previously active file.
        if (isDiffView(currentActiveView)) {
          return;
        }

        this.setNewActiveGitFile(undefined);
      }
    } catch {
      /* Empty */
    }
  }
}
