import type GitChangelogPlugin from 'main.ts';

import {
  addToQueue,
  addToQueueAndWait
} from 'obsidian-dev-utils/obsidian/Queue';

// Obsidian default behavior is to timeout long running tasks after 60 seconds
export const GIT_OPERATION_TIMEOUT_MILLISECONDS = 59_000;

export class TaskManager {
  public queueSize = $state(0);
  public queueIsEmpty = $derived(this.queueSize === 0);
  private controller = new AbortController();

  public constructor(private readonly plugin: GitChangelogPlugin) {}

  public abort(): void {
    this.controller.abort();
  }

  public async enqueueAndWait(
    task: () => Promise<void>,
    safely = false
  ): Promise<void> {
    /**
     * Artificially track the vault and file changelog queues,
     * because we need to determine if an empty changelog view is currently
     * resetting/loading or just empty
     */
    this.queueSize++;

    // Assuming all error handling is done within the task.
    await addToQueueAndWait(
      this.plugin.app,
      safely
        ? async (): Promise<void> => {
            try {
              await task();
            } catch (error) {
              if (error instanceof Error) {
                this.plugin.consoleDebug(error.message);
              } else {
                this.plugin.consoleDebug(`Queue task failed`);
              }
            }
          }
        : async (): Promise<void> => {
            await task();
          },
      GIT_OPERATION_TIMEOUT_MILLISECONDS
    );
    this.queueSize--;
  }

  public enqueueSafely(task: () => Promise<void>): void {
    this.queueSize++;

    // Passing everything in the callback is needed because errors are intercepted before
    addToQueue(
      this.plugin.app,
      async () => {
        try {
          await task();
        } catch (error) {
          if (error instanceof Error) {
            this.plugin.consoleDebug(error.message);
          } else {
            this.plugin.consoleDebug(`Queue task failed`);
          }
        } finally {
          this.queueSize--;
        }
      },
      GIT_OPERATION_TIMEOUT_MILLISECONDS
    );
  }

  public abortPreviousTasksAndGetSignal(): AbortSignal {
    this.controller.abort();
    this.controller = new AbortController();
    return this.controller.signal;
  }

  public getAbortSignal(): AbortSignal {
    return this.controller.signal;
  }
}
