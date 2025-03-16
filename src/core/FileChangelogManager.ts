import type { FileChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import type GitChangelogPlugin from 'main.ts';
import type { GitChangelogPluginSettings } from 'settings/settings.ts';
import type { TaskManager } from 'TaskManager.svelte.ts';
import type { ReadonlyDeep } from 'type-fest';
import type { ChangelogInterval, LogEntry } from 'types.ts';

import {
  CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER,
  CHANGELOG_LOAD_AMOUNT_VERSIONS,
  FILE_VIEW_VERSIONS_MULTIPLIER
} from 'constants.ts';
import { ChangelogManager } from 'core/ChangelogManager.svelte.ts';
import { runFileDiff } from 'core/gitOperations/runFileDiff.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { validateChangelogInterval } from 'settings/validation/changelogInterval.ts';

export class FileChangelogManager extends ChangelogManager<FileChangelogEntry> {
  public constructor({
    // ActiveGitFile,
    plugin,
    taskManager
  }: {
    // ActiveGitFile?: string;
    plugin: GitChangelogPlugin;
    taskManager: TaskManager;
  }) {
    super({ plugin, taskManager });
    // This.cachedActiveGitFile = activeGitFile;
  }

  public override async handleScroll({
    abortSignal
  }: {
    abortSignal: AbortSignal;
  }): Promise<void> {
    const filePath = this.getOldestVersionGitFilePath();
    if (filePath === undefined) {
      throw new Error('No active file');
    }
    await super.handleScroll({ abortSignal, filePath });
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
    const newSettings = this.plugin.settingsClone;

    newSettings.fileChangelogInterval = this.getNextInterval();

    // "false" because this function is only called in the context of triggering a new changelog computation, so we don't want to trigger a check that usually runs for this function (trigger recompute if some changelog generation settings changed).
    await this.plugin.saveSettings(newSettings, false);
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
    // eslint-disable-next-line no-magic-numbers
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

  protected override getInterval(
    settings: ReadonlyDeep<GitChangelogPluginSettings> = this.plugin.settings
  ): ChangelogInterval {
    const interval = settings.fileChangelogInterval;

    if (!validateChangelogInterval(interval)) {
      return DEFAULT_SETTINGS.fileChangelogInterval;
    }

    return interval;
  }

  protected override async runDiff({
    abortSignal,
    newCommit,
    oldCommit
  }: {
    abortSignal: AbortSignal;
    newCommit: LogEntry;
    oldCommit?: LogEntry;
  }): Promise<FileChangelogEntry> {
    return runFileDiff({
      abortSignal,
      newCommit,
      oldCommit,
      plugin: this.plugin
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
    // eslint-disable-next-line no-magic-numbers
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
