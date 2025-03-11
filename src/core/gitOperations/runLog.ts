import type GitChangelogPlugin from 'main.ts';
import type { LogEntry } from 'types.ts';

import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import { getRenameDetectionSensitivity } from 'settings/ui/RenameDetectionSensitivitySlider.ts';
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
    options['--name-only'] = null;
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

  return result.all.map<LogEntry>((entry) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    filePath: filePath ? entry.diff?.files.at(0)!.file : undefined,
    hash: entry.hash,

    timezoneAdjustedDate: spacetime(entry.date).goto(timezone)
  }));
}
