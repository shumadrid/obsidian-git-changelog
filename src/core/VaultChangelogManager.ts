import type { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
import type GitChangelogPlugin from 'main.ts';
import type { GitChangelogSettings } from 'settings/settings.ts';
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
import { pickVaultChangelogSettings } from 'settings/settings.ts';

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
    await this.plugin.settingsManager.editAndSave(
      (settings: GitChangelogSettings): void => {
        settings.vaultChangelogInterval = this.getNextInterval();
      }
    );
    this.plugin.app.workspace.trigger(
      'git-changelog:vault-changelog-generation-settings-changed'
    );
  }

  public override specificSettingsChanged(
    oldSettings: ReadonlyDeep<GitChangelogSettings>,
    newSettings: GitChangelogSettings
  ): boolean {
    const oldVaultGenerationSettings = pickVaultChangelogSettings(oldSettings);
    const newVaultGenerationSettings = pickVaultChangelogSettings(newSettings);

    return !deepEqual(oldVaultGenerationSettings, newVaultGenerationSettings);
  }

  public override getInterval(
    settings: ReadonlyDeep<GitChangelogSettings> = this.plugin.settings
  ): ChangelogInterval {
    return settings.vaultChangelogInterval;
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
    const git = await this.plugin.getGit();
    return await runRepoDiff({
      abortSignal,
      newCommit,
      oldCommit,
      plugin: this.plugin,
      git,
      diffAlgorithm: this.plugin.settings.diffAlgorithm,
      renameLimit: this.plugin.settings.renameLimit,
      renameDetectionStrictness: this.plugin.settings.renameDetectionStrictness,
      emptyTreeHash: await this.plugin.getEmptyTreeHash(),
      excludeFilesAndFoldersLines:
        this.plugin.settings.excludeFilesAndFoldersLines,
      convertToIncludeList: this.plugin.settings.convertToIncludeList,
      whitespaceIgnoreMode: this.plugin.settings.whitespaceIgnoreMode,
      ignoreBlankLines: this.plugin.settings.ignoreBlankLines
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
