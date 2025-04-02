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
import { deepEqual } from 'obsidian-dev-utils/Object';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';
import { validateChangelogInterval } from 'settings/validation/changelogInterval.ts';

export class VaultChangelogManager extends ChangelogManager<VaultChangelogEntry> {
  private collapseFirstVersion: boolean | undefined;

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

  public override resetAndGetSignal(): AbortSignal {
    const firstEntryExists = this.visibleEntries?.at(0);
    // Preserves the first entry collapsed state when users shuffles intervals and triggers multiple recomputes before any of them have the chance to finish.
    if (firstEntryExists) {
      this.collapseFirstVersion = firstEntryExists.isCollapsed;
    }
    return super.resetAndGetSignal();
  }

  public override async setNextInterval(): Promise<void> {
    const newSettings = this.plugin.settingsClone;

    newSettings.vaultChangelogGenerationSettings.interval =
      this.getNextInterval();

    await this.plugin.saveSettings(newSettings, false);
  }

  public override generationSettingsChanged(
    oldSettings: ReadonlyDeep<GitChangelogPluginSettings>,
    newSettings: GitChangelogPluginSettings
  ): boolean {
    if (
      !deepEqual(
        oldSettings.vaultChangelogGenerationSettings
          .excludeFilesAndFoldersLines,
        newSettings.vaultChangelogGenerationSettings.excludeFilesAndFoldersLines
      )
    ) {
      return true;
    }
    if (
      oldSettings.vaultChangelogGenerationSettings.convertToInclude !==
      newSettings.vaultChangelogGenerationSettings.convertToInclude
    ) {
      return true;
    }
    return super.generationSettingsChanged(oldSettings, newSettings);
  }

  public override getInterval(
    settings: ReadonlyDeep<GitChangelogPluginSettings> = this.plugin.settings
  ): ChangelogInterval {
    const interval = settings.vaultChangelogGenerationSettings.interval;

    if (!validateChangelogInterval(interval)) {
      return DEFAULT_SETTINGS.vaultChangelogGenerationSettings.interval;
    }

    return interval;
  }

  protected override calculateVersionsToAppend(resetCache: boolean): number {
    const initialLoadMultiplier = resetCache ? 2 : 1;

    return Math.ceil(initialLoadMultiplier * CHANGELOG_LOAD_AMOUNT_VERSIONS);
  }

  protected override async runDiff({
    abortSignal,
    newCommit,
    oldCommit
  }: {
    abortSignal: AbortSignal;
    newCommit: LogEntry;
    oldCommit?: LogEntry;
  }): Promise<undefined | VaultChangelogEntry> {
    return await runRepoDiff({
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
    retrievedEntries: VaultChangelogEntry[];
  }): void {
    // Preserve the collapsed state of the first version between recomputes....or expand the first version if this is the initial load (collapseFirstVersion undefined)
    if (this.allEntries === undefined && retrievedEntries.length > 0) {
      retrievedEntries[0].isCollapsed = this.collapseFirstVersion ?? false;
    }

    super.appendEntriesAndFillNextBatch({ retrievedEntries });
  }
}
