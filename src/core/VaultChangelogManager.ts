import type { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import type GitChangelogPlugin from 'main.ts';
import type { GitChangelogPluginSettings } from 'settings/settings.ts';
import type { TaskManager } from 'TaskManager.svelte.ts';
import type { ReadonlyDeep } from 'type-fest';
import type { ChangelogInterval, LogEntry } from 'types.ts';

import {
  CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER,
  CHANGELOG_LOAD_AMOUNT_VERSIONS,
  VAULT_MAX_COUNT_MULTIPLIER
} from 'constants.ts';
import { ChangelogManager } from 'core/ChangelogManager.svelte.ts';
import { runRepoDiff } from 'core/gitOperations/runRepoDiff.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { validateChangelogInterval } from 'settings/validation/changelogInterval.ts';

export class VaultChangelogManager extends ChangelogManager<VaultChangelogEntry> {
  public constructor({
    plugin,
    taskManager
  }: {
    plugin: GitChangelogPlugin;
    taskManager: TaskManager;
  }) {
    super({ plugin, taskManager });
  }

  public override async computeChangelog(
    abortSignal: AbortSignal
  ): Promise<void> {
    await this.appendToVisibleEntries({
      abortSignal,
      filePath: undefined
    });
  }

  public override async setNextInterval(): Promise<void> {
    const newSettings = this.plugin.settingsClone;

    newSettings.vaultChangelogInterval = this.getNextInterval();

    // "false" because this function is only called in the context of triggering a new changelog computation, so we don't want to trigger a check that usually runs for this function (trigger recompute if some changelog generation settings changed).
    await this.plugin.saveSettings(newSettings, false);
  }

  protected override calculateVersionsToAppend(resetCache: boolean): number {
    // eslint-disable-next-line no-magic-numbers
    const initialLoadMultiplier = resetCache ? 2 : 1;

    return Math.ceil(initialLoadMultiplier * CHANGELOG_LOAD_AMOUNT_VERSIONS);
  }

  protected override runDiff({
    abortSignal,
    newCommit,
    oldCommit
  }: {
    abortSignal: AbortSignal;
    newCommit: LogEntry;
    oldCommit?: LogEntry;
  }): Promise<undefined | VaultChangelogEntry> {
    return runRepoDiff({
      abortSignal,
      newCommit,
      oldCommit,
      plugin: this.plugin
    });
  }

  protected override calculateMaxVersionsToGet(): number {
    // eslint-disable-next-line no-magic-numbers
    return Math.ceil(3 * CHANGELOG_LOAD_AMOUNT_VERSIONS);
  }

  protected override getInterval(
    settings: ReadonlyDeep<GitChangelogPluginSettings> = this.plugin.settings
  ): ChangelogInterval {
    const interval = settings.vaultChangelogInterval;

    if (!validateChangelogInterval(interval)) {
      return DEFAULT_SETTINGS.vaultChangelogInterval;
    }

    return interval;
  }

  protected override async updateEntries({
    abortSignal
  }: {
    abortSignal: AbortSignal;
  }): Promise<void> {
    const newEntries = await this.getLatestChangelogEntries({
      abortSignal
    });

    this.prependToExistingEntries({
      newEntries
    });
  }

  protected override calculateLogMaxCount({
    resetCache
  }: {
    plugin: GitChangelogPlugin;

    resetCache: boolean;
  }): number {
    // eslint-disable-next-line no-magic-numbers
    const initialLoadMultiplier = resetCache ? 2 : 1;

    const intervalMultiplier =
      VaultChangelogManager.getIntervalMaxCountMultiplier(this.getInterval());
    return (
      CHANGELOG_LOAD_AMOUNT_BASE_MULTIPLIER *
      initialLoadMultiplier *
      VAULT_MAX_COUNT_MULTIPLIER *
      intervalMultiplier
    );
  }

  protected override appendEntriesAndFillNextBatch({
    retrievedEntries
  }: {
    resetCache: boolean;
    retrievedEntries: VaultChangelogEntry[];
  }): void {
    // Copy over previous first version's collapsed state in the vault changelog if we are changing intervals...or expand the first version if this is the initial load (firstVersionCollapsed undefined)
    let firstVersionCollapsed: boolean | undefined;
    if (this.hasEntries) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      firstVersionCollapsed = this.allEntries![0].isCollapsed;
    }

    super.appendEntriesAndFillNextBatch({ retrievedEntries });

    if (this.hasEntries) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.allEntries![0].isCollapsed = firstVersionCollapsed ?? false;
    }
  }
}
