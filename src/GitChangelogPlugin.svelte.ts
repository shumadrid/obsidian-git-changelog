import type { ObsidianGitPlugin } from 'gitPluginTypes.ts';
import type { Debouncer, PluginSettingTab } from 'obsidian';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { SimpleGit } from 'simple-git';
import type {
  FileChangelogEntry,
  VaultChangelogEntry
} from 'Views/types.svelte.ts';

import { ChangelogTaskManager } from 'ChangelogTaskManager.svelte.ts';
import { debounce, ItemView, Notice } from 'obsidian';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';
import {
  changelogGenerationSettingsUnchanged,
  fileChangelogGenerationSettingsUnchanged,
  statusBarSettingsUnchanged,
  vaultChangelogGenerationSettingsUnchanged
} from 'settings/helper.ts';
import { GitChangelogPluginSettings } from 'settings/settings.ts';
import {
  gitPluginCompatibleVersion,
  gitPluginTestedVersion
} from 'settings/ui/GitPluginWarning.ts';
import {
  FILE_CHANGELOG_VIEW_CONFIG,
  FileChangelogView
} from 'Views/FileChangelog/FileChangelog.ts';
import { getActiveGitRelativeFile, isDiffView } from 'Views/helper.ts';
import {
  VAULT_CHANGELOG_VIEW_CONFIG,
  VaultChangelogView
} from 'Views/VaultChangelog/VaultChangelog.ts';

import type { ChangelogInterval } from './types.ts';

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
  public cachedActiveGitFile = $state<string>();
  public debouncedChangelogSettingsChangedCheck:
    | Debouncer<[], void>
    | undefined;

  public gitPluginState = $state<GitPluginState>(GitPluginState.Uninitialized);

  public gitRepoReady = $state<boolean>(false);
  public dependenciesReady = $derived(
    (this.gitPluginState === GitPluginState.Enabled ||
      this.gitPluginState === GitPluginState.UntestedVersion) &&
      this.gitRepoReady
  );

  public detectedTimeZone: string | undefined;

  public fileChangelogCacheInterval?: ChangelogInterval;
  public fileChangelogEntries: FileChangelogEntry[] | undefined = $state();

  // Settings: IGitChangelogSettings;

  public fileChangelogNewBatchEntries: FileChangelogEntry[] | undefined =
    $state();

  public settingsOfComputedCache?: ChangelogGenerationSettings;

  public statusBar?: StatusBar;
  public statusBarCachedTimeframe?: number;
  public vaultChangelogCacheInterval?: ChangelogInterval;
  public vaultChangelogEntries: undefined | VaultChangelogEntry[] = $state();
  public vaultChangelogNewBatchEntries: VaultChangelogEntry[] = $state([]);
  public changelogTaskManager!: ChangelogTaskManager;

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
    this.statusBar = new StatusBar(statusBarElement, this);
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

  public onSettingsSave(): void {
    if (changelogGenerationSettingsUnchanged(this)) {
      this.consoleDebug(
        'Identical changelog settings',
        this.settings.changelogGenerationSettings.gitDiffIgnore
      );
      if (
        !fileChangelogGenerationSettingsUnchanged(this) &&
        this.cachedActiveGitFile
      ) {
        // This.fileChangelogCacheInterval = undefined;
        this.app.workspace.trigger(
          'obsidian-git-changelog:file-changelog-generation-settings-changed'
        );
      }
      if (!statusBarSettingsUnchanged(this) && this.cachedActiveGitFile) {
        // This.statusBarCachedTimeframe = undefined;
        this.app.workspace.trigger(
          'obsidian-git-changelog:status-bar-settings-changed'
        );
      }
      if (!vaultChangelogGenerationSettingsUnchanged(this)) {
        // This.vaultChangelogCacheInterval = undefined;
        this.app.workspace.trigger(
          'obsidian-git-changelog:vault-changelog-generation-settings-changed'
        );
      }
    } else {
      // So it's not redundantly triggered multiple times
      this.app.workspace.trigger(
        'obsidian-git-changelog:generation-settings-changed'
      );
    }
  }

  public updateActiveGitFile(): void {
    try {
      const currentActiveGitFile = getActiveGitRelativeFile(this);
      if (currentActiveGitFile) {
        if (currentActiveGitFile !== this.cachedActiveGitFile) {
          this.cachedActiveGitFile = currentActiveGitFile;
          this.app.workspace.trigger(
            'obsidian-git-changelog:active-file-changed'
          );
        }
      } else {
        const currentActiveView =
          this.app.workspace.getActiveViewOfType(ItemView);
        if (isDiffView(currentActiveView)) {
          return;
        }
        this.cachedActiveGitFile = undefined;
        this.app.workspace.trigger(
          'obsidian-git-changelog:active-file-changed'
        );
      }
    } catch {
      /* Empty */
    }
  }

  // Functions below are from obsidian-dev-utils (https://github.com/mnaoumov/obsidian-dev-utils/blob/main/src/obsidian/Plugin/PluginBase.ts)

  public override async saveSettings(
    newSettings: GitChangelogPluginSettings,
    checkForChanges = true
  ): Promise<void> {
    await super.saveSettings(newSettings);
    if (checkForChanges) {
      this.debouncedChangelogSettingsChangedCheck?.();
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

  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async onLayoutReady(): Promise<void> {
    // This has to be initiated first. Handles all operations.
    this.changelogTaskManager = new ChangelogTaskManager(this);

    if (this.settings.statusBarStats) {
      this.assignStatusBar();
    }

    this.registerEvent(
      this.app.workspace.on('file-open', () => {
        this.updateActiveGitFile();
      })
    );

    // This.registerEvent(
    //   This.app.workspace.on('active-leaf-change', () => {
    //     This.clearActiveGitFileIfNoViewOpen();
    //   }),
    // );

    // Because of the case when the git plugin is re-enabled. Otherwise the file changelog view wouldn't refresh with the data from the current active note until the first file-open event.
    this.registerEvent(
      this.app.workspace.on('obsidian-git:head-change', () => {
        this.updateActiveGitFile();
      })
    );

    this.updateActiveGitFile();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addVaultChangelogView();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addFileChangelogView();
  }

  protected override onloadComplete(): void {
    // Runs when plugin is unloaded.
    this.register(() => {
      this.debouncedChangelogSettingsChangedCheck?.cancel();
      if (this.changelogTaskManager) {
        this.changelogTaskManager.abortAll();
      }
    });

    this.registerView(VAULT_CHANGELOG_VIEW_CONFIG.type, (leaf) => {
      return new VaultChangelogView(leaf, this);
    });

    this.registerView(FILE_CHANGELOG_VIEW_CONFIG.type, (leaf) => {
      return new FileChangelogView(leaf, this);
    });

    addCommands(this);

    this.debouncedChangelogSettingsChangedCheck = debounce(
      () => {
        this.onSettingsSave();
      },
      // eslint-disable-next-line no-magic-numbers
      500,
      true
    );
  }
}
