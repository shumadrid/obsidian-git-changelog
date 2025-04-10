import type { LogResult, SimpleGit } from 'simple-git';
import type { LogEntry } from 'types.ts';

import spacetime from 'spacetime';
import { AbortError } from 'types.ts';

/**
 * Returns undefined if an error happens during a git log. For example, passed a non-existent commit hash or if there are no commits in the repo.
 */
export async function getCommitTimestampOrUndefined({
  abortSignal,
  commitHash,
  git,
  timeZone
}: {
  abortSignal: AbortSignal;
  commitHash?: string;
  git: SimpleGit;
  timeZone: string;
}): Promise<LogEntry | undefined> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }

  const options: Record<string, unknown> = {
    // "--no-patch": null,

    '--diff-merges': 'first-parent',
    format: {
      date: '%cI',
      hash: '%H'
    },
    maxCount: 1,
    // Splitter: '\0',
    strictDate: true
  };
  if (commitHash) {
    options[commitHash] = null;
  }

  let result: LogResult;
  try {
    result = await git.log(options);
  } catch {
    return undefined;
  }
  // eslint-disable-next-line eqeqeq
  if (result?.latest == null) {
    return undefined;
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  return result.all
    .map<LogEntry>((entry) => ({
      filePath: undefined,
      hash: entry.hash,
      timeZoneAdjustedDate: spacetime(entry.date).goto(timeZone)
    }))
    .at(0);
}
