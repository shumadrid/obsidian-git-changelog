import type { GitChangelogPluginTypes } from 'constants.ts';
import type { ExtractPluginSettingsWrapper } from 'obsidian-dev-utils/obsidian/Plugin/PluginTypesBase';
import type { TaskManager } from 'TaskManager.svelte.ts';
import type { ReadonlyDeep } from 'type-fest';

import { findFirstFileCommitBefore } from 'core/findFirstFileCommitBefore.ts';
import { runCheckIgnore } from 'core/gitOperations/runCheckIgnore.ts';
import { runWorkingDirFileDiff } from 'core/gitOperations/runWorkingDirFileDiff.ts';
import { MarkdownView } from 'obsidian';
import { AbortError, DiffMeasurementUnit } from 'types.ts';
import { getGitRelativeFilePath } from 'Views/helper.ts';

import type GitChangelogPlugin from './main.ts';

export class StatusBarStats {
  public constructor(
    private statusBarElement: HTMLElement,
    private readonly plugin: GitChangelogPlugin,
    public taskManager: TaskManager
  ) {
    // Initialize immediately
    this.setText('+... -...');
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
        // Set loading state
        this.setText('+... -...');
        // Then schedule a recompute
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
        this.recompute();
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
    oldSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >,
    newSettings: ReadonlyDeep<
      ExtractPluginSettingsWrapper<GitChangelogPluginTypes>
    >
  ): boolean {
    return (
      oldSettings.safeSettings.statusBarInterval !==
      newSettings.safeSettings.statusBarInterval
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
      if (abortSignal.aborted) {
        throw new AbortError();
      }
      if (this.plugin.settings.showStatusBarStats) {
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
    } catch (error) {
      // If the error was an AbortError, don't do anything. Otherwise, remove the status bar stats.
      if (!(error instanceof AbortError)) {
        this.setText('');
      }
    }
  }

  private recompute(): void {
    const abortSignal = this.taskManager.abortPreviousTasksAndGetSignal();

    this.taskManager.enqueueSafely(async () => {
      await this.updateStats(abortSignal);
    });
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

    const git = await this.plugin.getGit();

    const oldCommit = await findFirstFileCommitBefore({
      abortSignal,
      filePath: activeGitFile,
      minutes: this.plugin.settings.statusBarInterval,
      timeZone: await this.plugin.getEmptyTreeHash(),
      git,
      renameDetectionStrictness: this.plugin.settings.renameDetectionStrictness
    });

    if (oldCommit && oldCommit.fileDeleted !== true) {
      const baseStats = await runWorkingDirFileDiff({
        abortSignal,
        oldCommit,
        activeGitFile,
        git,
        diffAlgorithm: this.plugin.settings.diffAlgorithm,
        whitespaceIgnoreMode: this.plugin.settings.whitespaceIgnoreMode,
        ignoreBlankLines: this.plugin.settings.ignoreBlankLines
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
        git
      });

      if (fileIsGitIgnored) {
        return 'In .gitignore';
      }
      const measurementUnit = this.plugin.settings.diffMeasurementUnit;

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
