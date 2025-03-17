import type { GitChangelogPluginSettings } from 'settings/settings.ts';
import type { TaskManager } from 'TaskManager.svelte.ts';

import { findFirstCommitBefore } from 'core/gitOperations/findFirstCommitBefore.ts';
import { runCheckIgnore } from 'core/gitOperations/runCheckIgnore.ts';
import { runWorkingDirFileDiff } from 'core/gitOperations/runWorkingDirFileDiff.ts';
import { MarkdownView } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { getMeasurementUnit } from 'settings/ui/ChangelogMeasurementUnit.ts';
import { getStatusBarInterval } from 'settings/ui/StatusBarInterval.ts';
import { DiffMeasurementUnit } from 'types.ts';
import { getActiveGitFileFromView } from 'Views/helper.ts';

import type GitChangelogPlugin from './main.ts';

export class StatusBar {
  public constructor(
    private statusBarElement: HTMLElement,
    private readonly plugin: GitChangelogPlugin,
    public taskManager: TaskManager
  ) {
    // Initialize immediately
    this.recompute();

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
    oldSettings: GitChangelogPluginSettings,
    newSettings: GitChangelogPluginSettings
  ): boolean {
    return (
      getStatusBarInterval(oldSettings) !== getStatusBarInterval(newSettings)
    );
  }

  public remove(): void {
    this.statusBarElement.remove();
    this.taskManager.abort();
  }

  private setStatusBar(text: string): void {
    this.statusBarElement.setText(text);
  }

  private async updateStatusBarWithFileStats(
    abortSignal: AbortSignal
  ): Promise<void> {
    try {
      if (this.plugin.settings.statusBarStats) {
        const result = await this.getDiffStatsForActiveFile(
          this.plugin.app.workspace.getActiveViewOfType(MarkdownView),
          abortSignal
        );
        if (result) {
          this.setStatusBar(result);
        } else {
          this.setStatusBar('');
        }
      }
    } catch {
      this.setStatusBar('');
    }
  }

  private recompute(reset = true): void {
    const abortSignal = reset
      ? this.taskManager.abortPreviousTasksAndGetSignal()
      : this.taskManager.getAbortSignal();
    invokeAsyncSafely(() =>
      this.taskManager.enqueueAndWait(async () => {
        await this.updateStatusBarWithFileStats(abortSignal);
      })
    );
  }

  private async getDiffStatsForActiveFile(
    activeFileView: MarkdownView | null,
    abortSignal: AbortSignal
  ): Promise<string | undefined> {
    const activeGitFile = getActiveGitFileFromView(activeFileView, this.plugin);

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
