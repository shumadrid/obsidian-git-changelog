import type { GitChangelogPluginTypes } from 'constants.ts';
import type { ChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import type GitChangelogPlugin from 'main.ts';
import type { ExtractPluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginTypesBase';
import type { GitChangelogSettings } from 'settings/settings.ts';
import type { Spacetime } from 'spacetime';
import type { TaskManager } from 'TaskManager.svelte.ts';
import type { ReadonlyDeep } from 'type-fest';
import type { LogEntry } from 'types.ts';

import { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import { runLog } from 'core/gitOperations/runLog.ts';
import {
  extractLastCommitsForInterval,
  GIT_MAX_CONCURRENT_PROCESSES
} from 'core/helper.ts';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import { AbortError, ChangelogInterval } from 'types.ts';
import { assertNotNull } from 'utils.ts';

export abstract class ChangelogManager<T extends ChangelogEntry> {
  public visibleEntries = $state<T[] | undefined>();
  public taskManager: TaskManager;

  public hasEntries = $derived((this.visibleEntries?.length ?? 0) > 0);

  protected reservedEntries: T[] = [];

  protected plugin: GitChangelogPlugin;

  protected get latestCachedVersion(): T | undefined {
    return this.allEntries?.at(0);
  }

  protected get allEntries(): T[] | undefined {
    return this.visibleEntries
      ? [...this.visibleEntries, ...this.reservedEntries]
      : undefined;
  }

  protected get oldestCachedVersion(): T | undefined {
    return this.allEntries?.at(-1);
  }

  protected constructor({
    plugin,
    taskManager
  }: {
    plugin: GitChangelogPlugin;
    taskManager: TaskManager;
  }) {
    this.plugin = plugin;
    this.taskManager = taskManager;
  }

  public static initialCommitReached(
    entries: ChangelogEntry[] | undefined
  ): boolean {
    if (entries && (entries.length === 0 || entries[0].isInitialCommit())) {
      return true;
    }

    return false;
  }

  protected static getIntervalMaxCountMultiplier(
    interval: ChangelogInterval
    // eslint-disable-next-line no-magic-numbers
  ): 1 | 200 | 56 | 9 {
    switch (interval) {
      case ChangelogInterval.Daily: {
        // eslint-disable-next-line no-magic-numbers
        return 9;
      }
      case ChangelogInterval.Hourly: {
        return 1;
      }
      case ChangelogInterval.Monthly: {
        // eslint-disable-next-line no-magic-numbers
        return 200;
      }
      case ChangelogInterval.Weekly: {
        // eslint-disable-next-line no-magic-numbers
        return 56;
      }
      default: {
        return 1;
      }
    }
  }

  public handleScroll = async (): Promise<void> => {
    const abortSignal = this.taskManager.getAbortSignal();
    await this.taskManager.enqueueAndWait(async () => {
      await this.loadEntries({ abortSignal });
    }, true);
  };

  public resetSafely(): void {
    // We want to immediately cancel all current operations for the changelog and schedule the operation in a queue.
    const abortSignal = this.resetAndGetSignal();

    // Abort controllers don't just serve to optimize performance by stopping the execution of cancelled functions, but they also serve to prevent those cancelled functions from mutating current state and introducing race conditions.
    // All abort signals need to be created on call time, and also the plugin settings (it's not strictly necessary, because operations with outdated settings will always get cancelled anyway).
    this.taskManager.enqueueSafely(async () => {
      await this.computeChangelog(abortSignal);
    });
  }

  public tryUpdateEntries(): void {
    const abortSignal = this.taskManager.getAbortSignal();
    this.taskManager.enqueueSafely(async () => {
      if (this.allEntries === undefined) {
        this.plugin.consoleDebug(
          "If git plugin wasn't just re-enabled, then a redundant changelog recomputation occurred."
        );
        // Because of the case when the git plugin is re-enabled.
        await this.computeChangelog(abortSignal);
      } else {
        await this.updateEntries({
          abortSignal
        });
      }
    });
  }

  public abstract specificSettingsChanged(
    oldSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >,
    newSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >
  ): boolean;

  public resetAndGetSignal(): AbortSignal {
    // Reset `visibleEntries` to undefined each time when you schedule a recompute so that the UI correctly updates to "loading" state while it waits for the stats to compute.
    this.visibleEntries = undefined;
    this.reservedEntries = [];
    return this.taskManager.abortPreviousTasksAndGetSignal();
  }

  /**
   * This should ideally never trigger on user interaction but always automatically
   */
  public abstract computeChangelog(abortSignal: AbortSignal): Promise<void>;

  public abstract setNextInterval(): Promise<void>;

  public abstract getInterval(
    settings?: ReadonlyDeep<GitChangelogSettings>
  ): ChangelogInterval;

  protected abstract updateEntries({
    abortSignal
  }: {
    abortSignal: AbortSignal;
  }): Promise<void>;

  /**
   * Fetches and updates the cached changelog with any missing new entries. In
   * practice, this usually just involves overwriting the latest cached version entry
   * with updated data.
   */
  protected async getLatestChangelogEntries({
    abortSignal,
    activeGitFile
  }: {
    abortSignal: AbortSignal;
    activeGitFile?: string;
  }): Promise<T[]> {
    // Terminology:
    // ActiveGitFile: the current file path of some live file version.
    // FilePath: the path of some file in history.

    const git = await this.plugin.getGit();
    // Gets all commits newer (>=) than the commit of the latest cached version.
    const timeZoneAdjustedLogs = await runLog({
      abortSignal,
      filePath: activeGitFile,
      lowerBoundaryCommit: this.latestCachedVersion?.commitHash,
      maxCount: undefined,
      upperBoundaryCommit: undefined,
      git,
      renameDetectionStrictness: this.plugin.settings.renameDetectionStrictness,
      timeZone: getTimeZone(this.plugin)
    });

    const extractedVersions = await extractLastCommitsForInterval({
      dayStartHour: this.plugin.settings.dayStartHour,
      interval: this.getInterval(),
      timeZoneAdjustedLogs
    });

    // Always recalculate the latest version in cached changelog (because it likely has outdated stats), but only if there are any versions to recalculate.
    const versionBeforeLatestCached = this.allEntries?.at(1);
    if (
      versionBeforeLatestCached !== undefined &&
      !versionBeforeLatestCached.isInitialCommit()
    ) {
      extractedVersions.push({
        filePath: versionBeforeLatestCached.getPotentialGitFilePath(),
        hash: versionBeforeLatestCached.commitHash,
        timeZoneAdjustedDate: versionBeforeLatestCached.timeZoneAdjustedDate
      });
    }

    const createdEntries: T[] = [];
    while (extractedVersions.length > 1) {
      await this.concurrentDiffing({
        abortSignal,
        lastCommitsInEachVersion: extractedVersions,
        loadedEntries: createdEntries
      });
    }

    // If initial version was reached, diff it against an empty state.
    if (extractedVersions.length > 0 && this.cacheHasNoCompleteVersion()) {
      const lastCommit = assertNotNull(extractedVersions.at(-1));
      await this.appendToEntries({
        abortSignal,
        currentCommit: lastCommit,
        entries: createdEntries
      });
    }

    if (abortSignal.aborted) {
      throw new AbortError();
    }
    return createdEntries;
  }

  protected appendEntriesAndFillNextBatch({
    retrievedEntries
  }: {
    retrievedEntries: T[];
  }): void {
    // If this isn't the initial load and we aren't resetting the cache, then just append everything to the next batch.
    if (this.allEntries !== undefined) {
      this.reservedEntries.push(...retrievedEntries);
      return;
    }
    // Otherwise, initiate the list with sufficient entries and put all additional entries into the next batch reserve.
    const reserveEntries = retrievedEntries;
    const mainEntries = reserveEntries.splice(
      0,
      this.calculateVersionsToAppend(this.allEntries === undefined)
    );

    this.visibleEntries = mainEntries;
    this.reservedEntries = reserveEntries;
  }

  protected async appendToVisibleEntries({
    abortSignal,
    filePath
  }: {
    abortSignal: AbortSignal;
    filePath: string | undefined;
  }): Promise<void> {
    if (abortSignal.aborted) {
      throw new AbortError();
    }

    // If we are re-computing or initially loading we can't rely on the reserved entries because there aren't any (that are valid).
    if (this.visibleEntries === undefined) {
      await this.retrieveMoreEntries({
        abortSignal,
        filePath,
        upperBoundaryCommit: undefined
      });
    } else {
      // If necessary, retrieve additional entries (if there are any left) and then append.
      // Check for sufficient versions when the task gets it's turn, not when it is added to the queue.
      if (this.shouldRetrieveMoreReserveEntries()) {
        await this.maybeRetrieveReserveEntries({ abortSignal });
      }

      this.visibleEntries?.push(
        ...this.reservedEntries.splice(0, this.calculateVersionsToAppend(false))
      );
    }

    // After taking the versions out of the reserve, check if the reserve has enough versions for the next append, and schedule a task to retrieve more if necessary.
    this.taskManager.enqueueSafely(async () => {
      await this.maybeRetrieveReserveEntries({ abortSignal });
    });
  }

  protected async retrieveMoreEntries({
    abortSignal,
    filePath,
    upperBoundaryCommit
  }: {
    abortSignal: AbortSignal;
    filePath: string | undefined;
    upperBoundaryCommit: string | undefined;
  }): Promise<void> {
    // Both of these functions need to be wrapped inside a promise and passed into the queue.
    const newEntries = await this.getNextEntries({
      abortSignal,
      filePath,
      upperBoundaryCommit
    });

    this.appendEntriesAndFillNextBatch({
      retrievedEntries: newEntries
    });
  }

  protected abstract calculateVersionsToAppend(initialLoad: boolean): number;

  /**
   *   */

  protected abstract calculateMaxVersionsToGet(): number;

  protected abstract runDiff({
    abortSignal,
    newCommit,
    oldCommit
  }: {
    abortSignal: AbortSignal;
    newCommit: LogEntry;
    oldCommit?: LogEntry;
  }): Promise<ChangelogEntry | undefined>;

  protected abstract calculateLogMaxCount({
    resetCache
  }: {
    resetCache: boolean;
  }): number;

  protected getNextInterval(): ChangelogInterval {
    let interval = this.getInterval();

    switch (interval) {
      case ChangelogInterval.Daily: {
        interval = ChangelogInterval.Weekly;
        break;
      }
      case ChangelogInterval.Hourly: {
        interval = ChangelogInterval.Daily;
        break;
      }
      case ChangelogInterval.Monthly: {
        interval = ChangelogInterval.Hourly;
        break;
      }
      case ChangelogInterval.Weekly: {
        interval = ChangelogInterval.Monthly;
        break;
      }
    }
    return interval;
  }

  protected async getNextEntries({
    abortSignal,
    filePath,
    upperBoundaryCommit
  }: {
    abortSignal: AbortSignal;
    filePath: string | undefined;
    upperBoundaryCommit: string | undefined;
  }): Promise<T[]> {
    let reachedInitialCommit = false;

    let logMaxCount = this.calculateLogMaxCount({
      resetCache: this.allEntries === undefined
    });

    const maxVersionsToGet = this.calculateMaxVersionsToGet();
    const minVersionsToGet = this.calculateVersionsToAppend(
      this.allEntries === undefined
    );

    const interval = this.getInterval();

    this.plugin.consoleDebug(
      'appendChangelogEntries minVersionsToGet',
      minVersionsToGet
    );

    const fullyAdjustedSeenDates = new Set<Spacetime>();

    let startingCommit = upperBoundaryCommit;
    let startingFilePath: string | undefined = filePath;
    const lastCommitsInEachVersion: LogEntry[] = [];
    const loadedEntries: T[] = [];

    let upperBoundaryVersionRemoved = false;

    let logCycles = 0;
    while (
      lastCommitsInEachVersion.length + loadedEntries.length <
        minVersionsToGet &&
      !reachedInitialCommit
    ) {
      logCycles++;

      const git = await this.plugin.getGit();
      const timeZoneAdjustedLogs = await runLog({
        abortSignal,
        filePath: startingFilePath,
        lowerBoundaryCommit: undefined,
        maxCount: logMaxCount,
        git,
        renameDetectionStrictness:
          this.plugin.settings.renameDetectionStrictness,
        timeZone: getTimeZone(this.plugin),
        upperBoundaryCommit: startingCommit
      });

      // All we need from a version is its latest commit, not all commits included in that interval
      const extractedVersions = await extractLastCommitsForInterval({
        dayStartHour: this.plugin.settings.dayStartHour,
        interval,
        previouslySeenFullyAdjustedDates: fullyAdjustedSeenDates,
        timeZoneAdjustedLogs
      });

      if (timeZoneAdjustedLogs.length < logMaxCount) {
        reachedInitialCommit = true;
      }
      // If getting file changelog versions and need to loop many times, we need to track the file path across renames so that we can follow the target file across its whole history.
      startingFilePath = timeZoneAdjustedLogs.at(-1)?.filePath;

      startingCommit = timeZoneAdjustedLogs.at(-1)?.hash;

      lastCommitsInEachVersion.push(...extractedVersions);

      // Remove the first version if upper boundary commit was specified (to avoid duplicates, because the first version includes the upper boundary commit)
      if (
        upperBoundaryCommit !== undefined &&
        lastCommitsInEachVersion.length > 0 &&
        !upperBoundaryVersionRemoved
      ) {
        lastCommitsInEachVersion.shift();
        upperBoundaryVersionRemoved = true;
      }

      this.plugin.consoleDebug(
        'Amount of versions retrieved from Git log:',
        lastCommitsInEachVersion.length
      );

      // Process all versions except the last one. Uses the last version only for comparison and doesn't calculate stats for that version because it has no previous version to compare against (in this loop iteration at least)
      let emptyDiffHappened = false;
      while (
        lastCommitsInEachVersion.length > 1 &&
        loadedEntries.length < maxVersionsToGet
      ) {
        if (
          await this.concurrentDiffing({
            abortSignal,
            lastCommitsInEachVersion,
            loadedEntries
          })
        ) {
          emptyDiffHappened = true;
        }
      }

      // If an empty diff happened (entry === undefined), it is most likely a sign of a very exclusive "Exclude files and folders" setting. Adapt to this by doubling the amount of logs to get for the next git log run. Doesn't apply to file changelog operations.
      if (emptyDiffHappened && !filePath) {
        logMaxCount *= 2;
      }
    }
    this.plugin.consoleDebug(
      'Log cycles needed to load sufficient versions:',
      logCycles
    );

    // After the while loop ends, there should always be one entry left in the lastCommitsInEachVersion array.
    // We do additional logic if that entry is the initial version.
    const nextVersionIsInitialVersion =
      reachedInitialCommit &&
      // Only append the initial version if we already loaded everything after it, and the initial version is the only one that's left.
      lastCommitsInEachVersion.length === 1;

    // If initial version reached, diff it against an empty state.
    if (nextVersionIsInitialVersion) {
      const lastCommit = lastCommitsInEachVersion[0];
      await this.appendToEntries({
        abortSignal,
        currentCommit: lastCommit,
        entries: loadedEntries
      });
    }

    // Final check to see if these results are still needed.
    if (abortSignal.aborted) {
      throw new AbortError();
    }

    return loadedEntries;
  }

  protected getUpperBoundaryCommit(): string | undefined {
    return this.oldestCachedVersion?.commitHash;
  }

  protected async maybeRetrieveReserveEntries({
    abortSignal
  }: {
    abortSignal: AbortSignal;
  }): Promise<void> {
    if (this.shouldRetrieveMoreReserveEntries()) {
      await this.retrieveMoreEntries({
        abortSignal,

        filePath: assertNotNull(
          this.oldestCachedVersion
        ).getPotentialGitFilePath(),

        upperBoundaryCommit: assertNotNull(this.oldestCachedVersion).commitHash
      });
    }
  }

  /**
   * Updates the cached changelog with missing new entries. In practice, most of the time it just overwrites the latest cached version entry with newer data.
   */
  protected prependToExistingEntries({
    newEntries
  }: {
    newEntries: T[];
  }): void {
    if (this.visibleEntries === undefined) {
      this.visibleEntries = newEntries;
      return;
    }

    if (this.visibleEntries.length === 0) {
      this.visibleEntries.push(...newEntries);
      return;
    }

    // It doesn't assign undefined to the cache, as the empty newEntries may also indicate that no new entries are available and the cached changelog is already up to date. Not designed to handle cases where the repo or file history is completely empty with no changes to detect.
    if (newEntries.length === 0) {
      return;
    }

    const oldestNewEntry = assertNotNull(newEntries.at(-1));
    // If updating the latest incomplete version, keep the isCollapsed state from current view. (File changelog entries aren't collapsible)
    if (
      oldestNewEntry instanceof VaultChangelogEntry &&
      this.visibleEntries[0] instanceof VaultChangelogEntry
    ) {
      oldestNewEntry.isCollapsed = this.visibleEntries[0].isCollapsed;
    }

    // Also updates the latest cached version with newer data.
    this.visibleEntries.splice(0, 1, ...newEntries);
  }

  protected async loadEntries({
    abortSignal,
    filePath
  }: {
    abortSignal: AbortSignal;
    filePath?: string;
  }): Promise<void> {
    if (!ChangelogManager.initialCommitReached(this.visibleEntries)) {
      await this.appendToVisibleEntries({
        abortSignal,
        filePath
      });
    }
  }

  protected cacheHasNoCompleteVersion(): boolean {
    if (
      this.allEntries === undefined ||
      this.allEntries.length === 0 ||
      this.allEntries[0].isInitialCommit()
    ) {
      return true;
    }
    return false;
  }

  protected shouldRetrieveMoreReserveEntries(): boolean {
    if (
      this.allEntries === undefined ||
      ChangelogManager.initialCommitReached(this.allEntries)
    ) {
      // Can't reserve more entries because there aren't any, since even the main entries list doesn't have sufficient entries.
      return false;
    }
    return !this.reserveEntriesHaveEnoughVersions();
  }

  protected reserveEntriesHaveEnoughVersions(): boolean {
    const minVersionsToGet = this.calculateVersionsToAppend(
      //  This.allEntries === undefined
      false
    );

    return this.reservedEntries.length >= minVersionsToGet;
  }

  protected async appendToEntries({
    abortSignal,
    currentCommit,
    entries,
    previousCommit
  }: {
    abortSignal: AbortSignal;
    currentCommit: LogEntry;
    entries: ChangelogEntry[];
    previousCommit?: LogEntry;
  }): Promise<void> {
    const entry = await this.runDiff({
      abortSignal,
      newCommit: currentCommit,
      oldCommit: previousCommit
    });
    // Generate a new version only if the Git diff showed changes.
    if (entry) {
      entries.push(entry);
    }
  }

  protected async concurrentDiffing({
    abortSignal,
    lastCommitsInEachVersion,
    loadedEntries
  }: {
    abortSignal: AbortSignal;
    lastCommitsInEachVersion: LogEntry[];
    loadedEntries: ChangelogEntry[];
  }): Promise<boolean> {
    const gitDiffTasks: Promise<ChangelogEntry | undefined>[] = [];
    const batchSize = Math.min(
      GIT_MAX_CONCURRENT_PROCESSES,
      lastCommitsInEachVersion.length - 1
    );

    for (let index = 0; index < batchSize; index++) {
      const currentCommit = lastCommitsInEachVersion[index];
      const previousCommit = lastCommitsInEachVersion[index + 1];

      const promise = this.runDiff({
        abortSignal,
        newCommit: currentCommit,
        oldCommit: previousCommit
      });

      gitDiffTasks.push(promise);
    }

    // Concurrently runs all the tasks in the batch, because they are independent of each other. Allows errors to propagate.
    const promiseResults = await Promise.all(gitDiffTasks);

    // Filter out non-existent versions (if the diff was empty)
    const loadedEntriesBatch = promiseResults.filter(
      (entry) => entry !== undefined
    );

    loadedEntries.push(...loadedEntriesBatch);

    // Remove processed versions
    lastCommitsInEachVersion.splice(0, batchSize);

    const emptyDiffHappened =
      loadedEntriesBatch.length !== promiseResults.length;

    return emptyDiffHappened;
  }
}
