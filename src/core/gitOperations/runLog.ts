import type GitChangelogPlugin from 'main.ts';
import type { DiffResultNameStatusFile } from 'simple-git';
import type { LogEntry } from 'types.ts';

import { unescapeGitFileOutput } from 'core/gitOperations/helper.ts';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import { getRenameDetectionSensitivity } from 'settings/ui/RenameDetectionSensitivitySlider.ts';
import { DiffNameStatus } from 'simple-git';
import spacetime from 'spacetime';
import { AbortError } from 'types.ts';

// Less efficient than running raw?
export async function runLog({
  abortSignal,
  filePath,
  lowerBoundaryCommit,
  maxCount,
  plugin,
  upperBoundaryCommit
}: {
  abortSignal: AbortSignal;
  filePath: string | undefined;
  lowerBoundaryCommit: string | undefined;
  maxCount?: number;
  plugin: GitChangelogPlugin;
  upperBoundaryCommit: string | undefined;
}): Promise<LogEntry[]> {
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

    // --name-only
    options['--follow'] = null;
    options['--find-renames'] =
      `${getRenameDetectionSensitivity(plugin.settings.changelogGenerationSettings)}%`;
  }

  if (upperBoundaryCommit) {
    options[upperBoundaryCommit] = null;
  } else if (retrievingNewLogs) {
    options['--boundary'] = null;
    options[`${lowerBoundaryCommit}..HEAD`] = null;
  }
  if (abortSignal.aborted) {
    throw new AbortError();
  }
  const git = await plugin.getGit();
  const result = await git.log(options);
  const timezone = getTimeZone(
    plugin.settings.changelogGenerationSettings,
    plugin
  );

  const logs: LogEntry[] = [];
  for (const entry of result.all) {
    let fileDeleted: boolean | undefined;

    if (filePath) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const file = entry.diff!.files.at(0) as DiffResultNameStatusFile;

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
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          unescapeGitFileOutput(entry.diff!.files.at(0)!.file)
        : undefined,
      hash: entry.hash,
      fileDeleted,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      binary: filePath ? entry.diff!.files.at(0)!.binary : undefined,
      timezoneAdjustedDate: spacetime(entry.date).goto(timezone)
    });
  }
  return logs;
}
