import type { SimpleGit } from 'simple-git';
import type { LogEntry } from 'types.ts';

import spacetime from 'spacetime';
import { AbortError } from 'types.ts';

export async function findFirstCommitBefore({
  abortSignal,
  minutes,
  git,
  timeZone
}: {
  abortSignal: AbortSignal;
  minutes: number;
  git: SimpleGit;
  timeZone: string;
}): Promise<LogEntry | undefined> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const options: Record<string, unknown> = {
    // "--no-patch": null,
    // eslint-disable-next-line no-magic-numbers
    '--before': `${minutes * 60 - 3} seconds ago`,
    '--diff-merges': 'first-parent',
    format: {
      date: '%cI',
      hash: '%H'
    },
    maxCount: 1,
    // Splitter: '\0',
    strictDate: true
  };

  const result = await git.log(options);

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // If all commits fall inside the interval, or file isn't in the repo
  if (result.total === 0) {
    return undefined;
  }

  return result.all.map<LogEntry>((entry) => ({
    filePath: undefined,
    hash: entry.hash,
    timeZoneAdjustedDate: spacetime(entry.date).goto(timeZone)
  }))[0];
}
