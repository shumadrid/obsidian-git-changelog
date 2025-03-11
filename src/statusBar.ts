import { findFirstCommitBefore } from 'core/gitOperations/findFirstCommitBefore.ts';
import { runCheckIgnore } from 'core/gitOperations/runCheckIgnore.ts';
import { runWorkingDirFileDiff } from 'core/gitOperations/runWorkingDirFileDiff.ts';
import { MarkdownView } from 'obsidian';
import { getMeasurementUnit } from 'settings/ui/ChangelogMeasurementUnit.ts';
import { getStatusBarAlternateInterval } from 'settings/ui/StatusBarInterval.ts';
import { DiffMeasurementUnit } from 'types.ts';
import { getActiveGitFileFromView } from 'Views/helper.ts';

import type GitChangelogPlugin from './main.ts';

export class StatusBar {
  public constructor(
    private statusBarElement: HTMLElement,
    private readonly plugin: GitChangelogPlugin
  ) {
    // Initialize immediately
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.updateStatusBarWithFileStats();

    this.plugin.registerEvent(
      this.plugin.app.workspace.on(
        'obsidian-git-changelog:generation-settings-changed',
        () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.updateStatusBarWithFileStats();
        }
      )
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.updateStatusBarWithFileStats();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on(
        'obsidian-git-changelog:status-bar-settings-changed',
        () => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.updateStatusBarWithFileStats();
        }
      )
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('editor-change', () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.updateStatusBarWithFileStats();
      })
    );
  }

  public remove(): void {
    this.statusBarElement.remove();
  }

  public setStatusBar(text: string): void {
    this.statusBarElement.setText(text);
  }

  public async updateStatusBarWithFileStats(): Promise<void> {
    try {
      if (this.plugin.settings.statusBarStats) {
        this.plugin.statusBarCachedTimeframe = getStatusBarAlternateInterval(
          this.plugin
        );

        const result = await this.getFileLatestDiffStats(
          this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
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

  private async getFileLatestDiffStats(
    activeFileView: MarkdownView | null
  ): Promise<string | undefined> {
    const activeGitFile = getActiveGitFileFromView(activeFileView, this.plugin);

    if (!(activeGitFile && activeFileView)) {
      return;
    }

    let additions = 0;
    let deletions = 0;

    const oldCommit = await findFirstCommitBefore({
      filePath: activeGitFile,
      minutes: getStatusBarAlternateInterval(this.plugin),
      plugin: this.plugin
    });

    if (oldCommit) {
      const baseStats = await runWorkingDirFileDiff({
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
