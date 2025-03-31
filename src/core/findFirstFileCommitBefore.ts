import type GitChangelogPlugin from 'main.ts';
import type { LogEntry } from 'types.ts';

import { runLog } from 'core/gitOperations/runLog.ts';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import spacetime from 'spacetime';
import { AbortError } from 'types.ts';

// Assumes the average neighboring commits are 5 minutes apart
const AVERAGE_COMMIT_FREQUENCY_MINUTES = 5;

export async function findFirstFileCommitBefore({
  abortSignal,
  filePath,
  minutes,
  plugin
}: {
  abortSignal: AbortSignal;
  filePath: string;
  minutes: number;
  plugin: GitChangelogPlugin;
}): Promise<LogEntry | undefined> {
  // eslint-disable-next-line no-magic-numbers
  const maxCount = Math.ceil(minutes / AVERAGE_COMMIT_FREQUENCY_MINUTES) + 20;

  let firstEntriesOutsideInterval: LogEntry[] = [];
  let startingFilePath = filePath;
  const currentTime = spacetime.now(
    getTimeZone(plugin.settings.changelogGenerationSettings, plugin)
  );
  let startingCommit: string | undefined;

  while (
    // If it's the first run
    !firstEntriesOutsideInterval.at(-1) ||
    // Only continue if commit(s) that happened before the specified interval aren't reached yet.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    firstEntriesOutsideInterval.at(-1)!.timezoneAdjustedDate.diff(
      currentTime,

      'minutes'
    ) <
      // Not <=
      minutes
  ) {
    firstEntriesOutsideInterval = await runLog({
      abortSignal,
      filePath: startingFilePath,
      lowerBoundaryCommit: undefined,
      maxCount,
      plugin,
      upperBoundaryCommit: startingCommit
    });

    if (firstEntriesOutsideInterval.length < maxCount) {
      // Reached initial commit, can't go back any further, exit the loop.
      break;
    }

    // If getting file changelog versions and need to loop many times, we need to track the file path across renames so that we can follow the target file across its whole history.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    startingFilePath = firstEntriesOutsideInterval.at(-1)!.filePath!;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    startingCommit = firstEntriesOutsideInterval.at(-1)!.hash;
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // We just need to get the most recent commit that's still outside the interval.
  for (const entry of firstEntriesOutsideInterval) {
    if (entry.timezoneAdjustedDate.diff(currentTime, 'minutes') >= minutes) {
      return entry;
    }
  }

  // If all commits fall inside the interval, or file isn't in the repo
  return undefined;
}
