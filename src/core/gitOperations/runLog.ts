import type { SimpleGit } from 'simple-git';
import type { LogEntry } from 'types.ts';

import { unescapeGitFileOutput } from 'core/gitOperations/helper.ts';
import spacetime from 'spacetime';
import { AbortError } from 'types.ts';
import { assertNotNull } from 'utils.ts';

import type { DiffResultNameStatusFile } from './simpleGitTypes.ts';

import { DiffNameStatus } from './simpleGitTypes.ts';

// Less efficient than running raw?
export async function runLog({
  abortSignal,
  filePath,
  lowerBoundaryCommit,
  maxCount,
  upperBoundaryCommit,
  timeZone,
  git,
  renameDetectionStrictness
}: {
  abortSignal: AbortSignal;
  filePath: string | undefined;
  lowerBoundaryCommit: string | undefined;
  maxCount?: number;
  upperBoundaryCommit: string | undefined;
  git: SimpleGit;
  timeZone: string;
  renameDetectionStrictness: number;
}): Promise<LogEntry[]> {
  if (abortSignal.aborted) {
    throw new AbortError();
  }
  // This is confusing, and could be accidentally broken in the future
  const retrievingNewLogs = lowerBoundaryCommit !== undefined;
  const options: Record<string, unknown> = {
    ...(filePath ? { file: filePath } : {}),
    ...(maxCount ? { maxCount } : {}),
    format: {
      date: '%cI',
      hash: '%H'
    },
    // Splitter: '\0',
    strictDate: true
    // "--no-patch": null,
  };

  if (filePath) {
    // Ensures that the changed files are listed for merge commits as well and the commit is not repeated for each parent. This only lists the changed files for the first parent. (main branch?)
    options['--diff-merges'] = 'first-parent';
    options['--name-status'] = null;

    // `--follow` does not work well on non-linear history. It does not work for files that were just renamed in the working directory but haven't been committed yet. It needs commit information to track renames.
    // This problem can be solved by running a separate git diff name-status command before running git log, to detect potential renames and get the last committed filename of the current file, but the performance impact is not worth it.
    options['--follow'] = null;
    options['--find-renames'] = `${renameDetectionStrictness}%`;
  }

  if (upperBoundaryCommit) {
    options[upperBoundaryCommit] = null;
  } else if (retrievingNewLogs) {
    options['--boundary'] = null;
    options[`${lowerBoundaryCommit}..HEAD`] = null;
  }

  const result = await git.log(options);

  const logs: LogEntry[] = [];
  for (const entry of result.all) {
    let fileDeleted: boolean | undefined;

    if (filePath) {
      const file = assertNotNull(entry.diff).files.at(
        0
      ) as DiffResultNameStatusFile;

      // Include X (Unknown) statuses and show error states instead of silently ignoring them. (Caused by repository corruption or other issues)
      //
      // B (Broken Pairing) "A file’s pairing (relationship between source and destination) was lost during rename or copy detection" I never detect this file status, but in cases it occurs it should probably be included.
      //
      // U (Unmerged) statuses can't show up here.

      if (file.status === DiffNameStatus.DELETED) {
        // First I wanted to stop and discard all the older commit entries the first time git log encountered a deletion status, but actually, if some file was deleted and re-added in your vault, you would want to see the whole history of that file, even if it e.g. kept moving in and out of your vault.
        //
        // Git log shows commits where the file was deleted, but these commits can't be used for diffing, if you try to you get an error because the file doesn't exist in that commit, only the record of it's deletion.
        //
        //  "options['--diff-filter'] = 'dt'" isn't useful in this case
        fileDeleted = true;
      }

      if (file.status === DiffNameStatus.CHANGED) {
        // Exclude T (files that have their type changed (i.e. regular file, symlink, submodule, ...)) because the results of these logs are being used for running diffs, and they might fail on these types of objects. (This is irregular and rare)

        continue;
      }
    }

    logs.push({
      filePath: filePath
        ? unescapeGitFileOutput(
            assertNotNull(assertNotNull(entry.diff).files.at(0)).file
          )
        : undefined,
      hash: entry.hash,
      fileDeleted,
      timeZoneAdjustedDate: spacetime(entry.date).goto(timeZone)
    });
  }
  return logs;
}
