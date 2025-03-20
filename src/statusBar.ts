import type { GitChangelogPluginSettings } from 'settings/settings.ts';
import type { TaskManager } from 'TaskManager.svelte.ts';
import type { ReadonlyDeep } from 'type-fest';

import { findFirstCommitBefore } from 'core/gitOperations/findFirstCommitBefore.ts';
import { runCheckIgnore } from 'core/gitOperations/runCheckIgnore.ts';
import { runWorkingDirFileDiff } from 'core/gitOperations/runWorkingDirFileDiff.ts';
import { MarkdownView } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { clearPendingQueueItems } from 'obsidian-dev-utils/obsidian/Queue';
import { getMeasurementUnit } from 'settings/ui/ChangelogMeasurementUnit.ts';
import { getStatusBarInterval } from 'settings/ui/StatusBarInterval.ts';
import { DiffMeasurementUnit } from 'types.ts';
import { getGitRelativeFilePath } from 'Views/helper.ts';

import type GitChangelogPlugin from './main.ts';

export class StatusBarStats {
  public constructor(
    private statusBarElement: HTMLElement,
    private readonly plugin: GitChangelogPlugin,
    public taskManager: TaskManager
  ) {
    // Initialize immediately
    this.recompute();

    // It doesn't listen to obsidian-git:head-change event because it always compares the working directory to some past commit anyway.

    this.plugin.registerEvent(
      this.plugin.app.workspace.on(
        'git-changelog:generation-settings-changed',
        () => {
          this.recompute();
        }
      )
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', () => {
        this.recompute();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on(
        'git-changelog:status-bar-settings-changed',
        () => {
          this.recompute();
        }
      )
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('editor-change', () => {
        // Previous operations aren't aborted because this will be triggered often, and the results will lag behind if new calls ones keep getting scheduled and resetting the previous calls before they finish.
        this.recompute(false);
      })
    );

    this.plugin.registerInterval(
      // Since the most frequent status bar interval is 1 minute, we check that frequently to verify if the stats are still valid for the current time range. Without this, in a scenario where Obsidian remains idle, none of the other events would trigger, and stats for edits made hours ago would still be in the status bar, even though they are possibly outside the specified interval by now.
      window.setInterval(() => {
        this.recompute();
        // eslint-disable-next-line no-magic-numbers
      }, 60 * 1000)
    );
  }

  public static generationSettingsChanged(
    oldSettings: ReadonlyDeep<GitChangelogPluginSettings>,
    newSettings: GitChangelogPluginSettings
  ): boolean {
    return (
      getStatusBarInterval(oldSettings) !== getStatusBarInterval(newSettings)
    );
  }

  public destroy(): void {
    this.statusBarElement.remove();
    this.taskManager.abort();
  }

  private setText(text: string): void {
    this.statusBarElement.setText(text);
  }

  private async updateStats(abortSignal: AbortSignal): Promise<void> {
    try {
      if (this.plugin.settings.statusBarStats) {
        const result = await this.calculateStatsForActiveFile(
          this.plugin.app.workspace.getActiveViewOfType(MarkdownView),
          abortSignal
        );
        if (result) {
          this.setText(result);
        } else {
          this.setText('');
        }
      }
    } catch {
      this.setText('');
    }
  }

  private recompute(reset = true): void {
    // Stop the massive build-up of updateStats() calls when the user is typing
    clearPendingQueueItems(this.plugin.app);

    const abortSignal = reset
      ? this.taskManager.abortPreviousTasksAndGetSignal()
      : this.taskManager.getAbortSignal();

    invokeAsyncSafely(() =>
      this.taskManager.enqueueAndWait(async () => {
        await this.updateStats(abortSignal);
      })
    );
  }

  private async calculateStatsForActiveFile(
    activeFileView: MarkdownView | null,
    abortSignal: AbortSignal
  ): Promise<string | undefined> {
    const activeGitFile = getGitRelativeFilePath(
      activeFileView?.file,
      this.plugin
    );

    if (!(activeGitFile && activeFileView)) {
      return;
    }

    let additions = 0;
    let deletions = 0;

    const oldCommit = await findFirstCommitBefore({
      abortSignal,
      filePath: activeGitFile,
      minutes: getStatusBarInterval(this.plugin.settings),
      plugin: this.plugin
    });

    if (oldCommit) {
      const baseStats = await runWorkingDirFileDiff({
        abortSignal,
        oldCommit,
        plugin: this.plugin
      });
      if (baseStats) {
        additions = baseStats.additions;
        deletions = baseStats.deletions;
      } else {
        // File is binary
        return;
      }
    } else {
      // For files with no commit found (either new or the interval is spanning entire history),
      // We can use the current file's word/line count, unless the file is git ignored, in that case show nothing to avoid misleading stats (don't show 0s)
      const fileIsGitIgnored = await runCheckIgnore({
        abortSignal,
        activeGitFile,
        plugin: this.plugin
      });

      if (fileIsGitIgnored) {
        return;
      }
      const measurementUnit = getMeasurementUnit(
        this.plugin.settings.changelogGenerationSettings
      );

      if (measurementUnit === DiffMeasurementUnit.Lines) {
        additions = activeFileView.editor.lineCount();
      } else if (measurementUnit === DiffMeasurementUnit.Words) {
        // Additions = activeFileView.editor.getValue().split(/\s+/).length;
        // To be implemented
      }
    }
    return `+${additions}  -${deletions}`;
  }
}
