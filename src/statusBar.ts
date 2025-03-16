import type { TaskManager } from 'TaskManager.svelte.ts';

import { findFirstCommitBefore } from 'core/gitOperations/findFirstCommitBefore.ts';
import { runCheckIgnore } from 'core/gitOperations/runCheckIgnore.ts';
import { runWorkingDirFileDiff } from 'core/gitOperations/runWorkingDirFileDiff.ts';
import { MarkdownView } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { getMeasurementUnit } from 'settings/ui/ChangelogMeasurementUnit.ts';
import { getStatusBarAlternateInterval } from 'settings/ui/StatusBarInterval.ts';
import { DiffMeasurementUnit } from 'types.ts';
import { getActiveGitFileFromView } from 'Views/helper.ts';

import type GitChangelogPlugin from './main.ts';

export class StatusBar {
  private statusBarCachedTimeframe?: number;

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
        this.recompute(false);
      })
    );
  }

  public statusBarSettingsUnchanged(): boolean {
    return (
      getStatusBarAlternateInterval(this.plugin) ===
      this.statusBarCachedTimeframe
    );
  }

  public remove(): void {
    this.statusBarElement.remove();
    this.taskManager.abort();
  }

  public setStatusBar(text: string): void {
    this.statusBarElement.setText(text);
  }

  private async updateStatusBarWithFileStats(
    abortSignal: AbortSignal
  ): Promise<void> {
    try {
      if (this.plugin.settings.statusBarStats) {
        this.statusBarCachedTimeframe = getStatusBarAlternateInterval(
          this.plugin
        );

        const result = await this.getFileLatestDiffStats(
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

  private async getFileLatestDiffStats(
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
      minutes: getStatusBarAlternateInterval(this.plugin),
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
      // We can use the current file's word/line count, but we need to handle
      // Two cases differently:
      // 1. New files not yet tracked by git -> show line/word count
      // 2. Git ignored files -> show nothing to avoid misleading stats (don't show 0s)
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
