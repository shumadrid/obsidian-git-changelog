import type { GitChangelogPluginTypes } from 'constants.ts';
import type { FileChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import type GitChangelogPlugin from 'main.ts';
import type { ExtractPluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginTypesBase';
import type { GitChangelogSettings } from 'settings/settings.ts';
import type { TaskManager } from 'TaskManager.svelte.ts';
import type { ReadonlyDeep } from 'type-fest';
import type { ChangelogInterval, FileLogEntry } from 'types.ts';

import {
  CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER,
  CHANGELOG_LOAD_AMOUNT_VERSIONS,
  FILE_VIEW_VERSIONS_MULTIPLIER
} from 'constants.ts';
import { ChangelogManager } from 'core/ChangelogManager.svelte.ts';
import { runFileDiff } from 'core/gitOperations/runFileDiff.ts';
import { deepEqual } from 'obsidian-dev-utils/Object';
import { pickFileChangelogSettings } from 'settings/settings.ts';

export class FileChangelogManager extends ChangelogManager<FileChangelogEntry> {
  public constructor({
    plugin,
    taskManager
  }: {
    plugin: GitChangelogPlugin;
    taskManager: TaskManager;
  }) {
    super({ plugin, taskManager });
  }

  /**
   * This should never trigger on user interaction but always automatically
   */
  public override async computeChangelog(
    abortSignal: AbortSignal
  ): Promise<void> {
    const activeGitFile = this.plugin.cachedActiveGitFile;
    if (activeGitFile === undefined) {
      return;
    }

    await this.appendToVisibleEntries({
      abortSignal,
      filePath: activeGitFile
    });
  }

  public override async setNextInterval(): Promise<void> {
    await this.plugin.settingsManager.editAndSave(
      (settings: GitChangelogSettings): void => {
        settings.fileChangelogInterval = this.getNextInterval();
      },
      true
    );
    this.plugin.app.workspace.trigger(
      'git-changelog:file-changelog-generation-settings-changed'
    );
  }

  public override specificSettingsChanged(
    oldSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >,
    newSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >
  ): boolean {
    const oldVaultGenerationSettings = pickFileChangelogSettings(oldSettings);
    const newVaultGenerationSettings = pickFileChangelogSettings(newSettings);

    return !deepEqual(oldVaultGenerationSettings, newVaultGenerationSettings);
  }

  public override getInterval(
    settings: ReadonlyDeep<GitChangelogSettings> = this.plugin.settings
  ): ChangelogInterval {
    return settings.fileChangelogInterval;
  }

  protected override async loadEntries({
    abortSignal
  }: {
    abortSignal: AbortSignal;
  }): Promise<void> {
    const filePath = this.getOldestVersionGitFilePath();
    if (filePath === undefined) {
      throw new Error('No active file');
    }
    await super.loadEntries({ abortSignal, filePath });
  }

  protected override async updateEntries({
    abortSignal
  }: {
    abortSignal: AbortSignal;
  }): Promise<void> {
    const activeGitFile = this.plugin.cachedActiveGitFile;
    if (activeGitFile === undefined) {
      throw new Error('No active file');
    }

    const newEntries = await this.getLatestChangelogEntries({
      abortSignal,
      activeGitFile
    });

    this.prependToExistingEntries({
      newEntries
    });
  }

  protected override calculateVersionsToAppend(resetCache: boolean): number {
    const initialLoadMultiplier = resetCache ? 2 : 1;

    return Math.ceil(
      initialLoadMultiplier *
        FILE_VIEW_VERSIONS_MULTIPLIER *
        CHANGELOG_LOAD_AMOUNT_VERSIONS
    );
  }

  protected override calculateMaxVersionsToGet(): number {
    return Math.ceil(
      // eslint-disable-next-line no-magic-numbers
      3 * FILE_VIEW_VERSIONS_MULTIPLIER * CHANGELOG_LOAD_AMOUNT_VERSIONS
    );
  }

  protected override async runDiff({
    abortSignal,
    newCommit,
    oldCommit
  }: {
    abortSignal: AbortSignal;
    newCommit: FileLogEntry;
    oldCommit?: FileLogEntry;
  }): Promise<FileChangelogEntry | undefined> {
    const git = await this.plugin.getGit();
    return await runFileDiff({
      abortSignal,
      newCommit,
      oldCommit,
      plugin: this.plugin,
      diffAlgorithm: this.plugin.settings.diffAlgorithm,
      whitespaceIgnoreMode: this.plugin.settings.whitespaceIgnoreMode,
      ignoreBlankLines: this.plugin.settings.ignoreBlankLines,
      emptyTreeHash: await this.plugin.getEmptyTreeHash(),
      git
    });
  }

  // Try to calculate the optimal max-count number based on varying circumstances.
  // Ideally we get just enough logs to fill one batch when scrolling without discard any extra logs or going into more than 1 while loop iteration.
  protected override calculateLogMaxCount({
    resetCache
  }: {
    plugin: GitChangelogPlugin;

    resetCache: boolean;
  }): number {
    const initialLoadMultiplier = resetCache ? 2 : 1;
    const intervalMultiplier =
      FileChangelogManager.getIntervalMaxCountMultiplier(this.getInterval());
    return (
      CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER *
      initialLoadMultiplier *
      intervalMultiplier
    );
  }

  private getOldestVersionGitFilePath(): string | undefined {
    return (
      this.oldestCachedVersion?.pathGitRelative ??
      this.plugin.cachedActiveGitFile
    );
  }
}
