import type { ObsidianGitPlugin } from 'gitPluginTypes.ts';
import type { Debouncer, PluginSettingTab } from 'obsidian';
import type { ChangelogGenerationSettings } from 'settings/settings.ts';
import type { SimpleGit } from 'simple-git';

import { FileChangelogManager } from 'core/FileChangelogManager.ts';
import { VaultChangelogManager } from 'core/VaultChangelogManager.ts';
import { debounce, ItemView, Notice } from 'obsidian';
import { PluginBase } from 'obsidian-dev-utils/obsidian/Plugin/PluginBase';
import { changelogGenerationSettingsUnchanged } from 'settings/helper.ts';
import { GitChangelogPluginSettings } from 'settings/settings.ts';
import {
  gitPluginCompatibleVersion,
  gitPluginTestedVersion
} from 'settings/ui/GitPluginWarning.ts';
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

  public onSettingsSave(): void {
    if (changelogGenerationSettingsUnchanged(this)) {
      this.consoleDebug(
        'Identical changelog settings',
        this.settings.changelogGenerationSettings.gitDiffIgnore
      );
      const activeGitFile = getActiveGitRelativeFile(this);
      if (
        this.fileChangelogManager &&
        !this.fileChangelogManager.generationSettingsUnchanged() &&
        activeGitFile
      ) {
        // This.fileChangelogCacheInterval = undefined;
        this.app.workspace.trigger(
          'git-changelog:file-changelog-generation-settings-changed'
        );
      }
      if (
        this.statusBar &&
        !this.statusBar.statusBarSettingsUnchanged() &&
        activeGitFile
      ) {
        // This.statusBarCachedTimeframe = undefined;
        this.app.workspace.trigger('git-changelog:status-bar-settings-changed');
      }
      if (
        this.vaultChangelogManager &&
        !this.vaultChangelogManager.generationSettingsUnchanged()
      ) {
        // This.vaultChangelogCacheInterval = undefined;
        this.app.workspace.trigger(
          'git-changelog:vault-changelog-generation-settings-changed'
        );
      }
    } else {
      // So it's not redundantly triggered multiple times
      this.app.workspace.trigger('git-changelog:generation-settings-changed');
    }
  }

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

  // Functions below are from obsidian-dev-utils (https://github.com/mnaoumov/obsidian-dev-utils/blob/main/src/obsidian/Plugin/PluginBase.ts)

  protected override createPluginSettingsTab(): null | PluginSettingTab {
    return new GitChangelogSettingsTab(this);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
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

    // This will detect if the current open file was renamed after every git commit.
    this.registerEvent(
      this.app.workspace.on('obsidian-git:head-change', () => {
        this.updateActiveGitFile();
      })
    );

    // This.registerEvent(
    //   This.app.workspace.on('active-leaf-change', () => {
    //     This.clearActiveGitFileIfNoViewOpen();
    //   }),
    // );

    this.updateActiveGitFile();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addVaultChangelogView();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addFileChangelogView();
  }

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
      () => {
        this.onSettingsSave();
      },
      // eslint-disable-next-line no-magic-numbers
      500,
      true
    );
  }

  private setNewActiveGitFile(activeGitFile: string | undefined): void {
    this.fileChangelogManager?.resetAndGetSignal();
    this.cachedActiveGitFile = activeGitFile;
    this.app.workspace.trigger('git-changelog:active-git-file-changed');
  }

  private updateActiveGitFile(): void {
    try {
      const currentActiveGitFile = getActiveGitRelativeFile(this);
      if (currentActiveGitFile === this.cachedActiveGitFile) {
        return;
      }

      if (currentActiveGitFile) {
        this.setNewActiveGitFile(currentActiveGitFile);
      } else {
        const currentActiveView =
          this.app.workspace.getActiveViewOfType(ItemView);
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
