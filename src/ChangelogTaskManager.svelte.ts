import type GitChangelogPlugin from 'main.ts';

import {
  addToQueue,
  addToQueueAndWait
} from 'obsidian-dev-utils/obsidian/Queue';

export const GIT_OPERATION_TIMEOUT_MILLISECONDS = 8000;

export class ChangelogTaskManager {
  public fileChangelogTasks = $state(0);
  public isFileQueueEmpty = $derived(this.fileChangelogTasks === 0);
  public vaultChangelogTasks = $state(0);
  public isVaultQueueEmpty = $derived(this.vaultChangelogTasks === 0);
  private fileChangelogController = new AbortController();
  private vaultChangelogController = new AbortController();
  private get tasks(): number {
    return this.fileChangelogTasks + this.vaultChangelogTasks;
  }

  public constructor(private readonly plugin: GitChangelogPlugin) {}

  public abortAll(): void {
    this.fileChangelogController.abort();
    this.vaultChangelogController.abort();
  }

  public async enqueueAndWait(
    task: () => Promise<void>,
    fileOrVault: 'file' | 'vault'
  ): Promise<void> {
    this.incrementQueueSize(fileOrVault);

    // Assuming all error handling is done within the task.
    await addToQueueAndWait(
      this.plugin.app,
      task,
      GIT_OPERATION_TIMEOUT_MILLISECONDS
    );
    this.decrementQueueSize(fileOrVault);
  }

  public enqueueSafely(
    task: () => Promise<void>,
    fileOrVault: 'file' | 'vault'
  ): void {
    this.incrementQueueSize(fileOrVault);

    // Passing everything in the callback is needed because errors are intercepted before
    addToQueue(
      this.plugin.app,
      () => {
        task()
          .catch((error) => {
            if (error instanceof Error) {
              this.plugin.consoleDebug(error.message);
            } else {
              this.plugin.consoleDebug(`${fileOrVault} task failed`);
            }
          })
          .finally(() => {
            this.decrementQueueSize(fileOrVault);
          });
      },
      GIT_OPERATION_TIMEOUT_MILLISECONDS
    );
  }

  public abortPreviousTasksAndGetSignal(
    fileOrVault: 'file' | 'vault'
  ): AbortSignal {
    if (fileOrVault === 'file') {
      this.fileChangelogController.abort();
      this.fileChangelogController = new AbortController();
      return this.fileChangelogController.signal;
    }
    this.vaultChangelogController.abort();
    this.vaultChangelogController = new AbortController();
    return this.vaultChangelogController.signal;
  }

  public getAbortSignal(fileOrVault: 'file' | 'vault'): AbortSignal {
    return fileOrVault === 'file'
      ? this.fileChangelogController.signal
      : this.vaultChangelogController.signal;
  }

  private decrementQueueSize(fileOrVault: 'file' | 'vault'): void {
    if (fileOrVault === 'file') {
      this.fileChangelogTasks--;
    } else {
      this.vaultChangelogTasks--;
    }
  }

  /**
   * Artificially track the vault and file changelog queues,
   * because we need to determine if an empty changelog view is currently
   * resetting/loading or just empty
   */
  private incrementQueueSize(fileOrVault: 'file' | 'vault'): void {
    if (fileOrVault === 'file') {
      this.fileChangelogTasks++;
    } else {
      this.vaultChangelogTasks++;
    }

    if (this.tasks > 1) {
      this.plugin.consoleDebug('queue size:', this.tasks);
    }
  }
}
