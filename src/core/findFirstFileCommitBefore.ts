import type { SimpleGit } from 'simple-git';
import type { LogEntry } from 'types.ts';

import { runLog } from 'core/gitOperations/runLog.ts';
import spacetime from 'spacetime';
import { AbortError } from 'types.ts';
import { assertNotNull } from 'utils.ts';

// Assumes the average neighboring commits are 5 minutes apart
const AVERAGE_COMMIT_FREQUENCY_MINUTES = 5;

export async function findFirstFileCommitBefore({
  abortSignal,
  filePath,
  minutes,
  timeZone,
  git,
  renameDetectionStrictness
}: {
  abortSignal: AbortSignal;
  filePath: string;
  minutes: number;
  timeZone: string;
  git: SimpleGit;
  renameDetectionStrictness: number;
}): Promise<LogEntry | undefined> {
  // eslint-disable-next-line no-magic-numbers
  const maxCount = Math.ceil(minutes / AVERAGE_COMMIT_FREQUENCY_MINUTES) + 20;

  let firstEntriesOutsideInterval: LogEntry[] = [];
  let startingFilePath = filePath;
  const currentTime = spacetime.now(timeZone);
  let startingCommit: string | undefined;

  while (
    // If it's the first run
    !firstEntriesOutsideInterval.at(-1) ||
    // Only continue if commit(s) that happened before the specified interval aren't reached yet.

    assertNotNull(firstEntriesOutsideInterval.at(-1)).timeZoneAdjustedDate.diff(
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
      upperBoundaryCommit: startingCommit,
      git,
      renameDetectionStrictness,
      timeZone
    });

    if (firstEntriesOutsideInterval.length < maxCount) {
      // Reached initial commit, can't go back any further, exit the loop.
      break;
    }

    // If getting file changelog versions and need to loop many times, we need to track the file path across renames so that we can follow the target file across its whole history.

    startingFilePath = assertNotNull(
      assertNotNull(firstEntriesOutsideInterval.at(-1)).filePath
    );

    startingCommit = assertNotNull(firstEntriesOutsideInterval.at(-1)).hash;
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // We just need to get the most recent commit that's still outside the interval.
  for (const entry of firstEntriesOutsideInterval) {
    if (entry.timeZoneAdjustedDate.diff(currentTime, 'minutes') >= minutes) {
      return entry;
    }
  }

  // If all commits fall inside the interval, or file isn't in the repo
  return undefined;
}
