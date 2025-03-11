import type GitChangelogPlugin from 'main.ts';
import type { LogEntry } from 'types.ts';

import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import { getRenameDetectionSensitivity } from 'settings/ui/RenameDetectionSensitivitySlider.ts';
import spacetime from 'spacetime';

export async function findFirstCommitBefore({
  filePath,
  minutes,
  plugin
}: {
  filePath: string | undefined;
  minutes: number;
  plugin: GitChangelogPlugin;
}): Promise<LogEntry | undefined> {
  const options: Record<string, unknown> = {
    ...(filePath ? { file: filePath } : {}),
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

  if (filePath) {
    options['--name-status'] = null;
    // --name-only
    options['--follow'] = null;

    const renameDetectionSensitivity = getRenameDetectionSensitivity(
      plugin.settings.changelogGenerationSettings
    );
    options['--find-renames'] = `${renameDetectionSensitivity.toString()}%`;
  }
  const git = await plugin.getGit();
  const result = await git.log(options);
  const timezone = getTimeZone(
    plugin.settings.changelogGenerationSettings,
    plugin
  );

  // If all commits fall inside the interval, or file isn't in the repo
  if (result.total === 0) {
    return undefined;
  }

  return result.all.map<LogEntry>((entry) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    filePath: filePath ? entry.diff?.files.first()!.file : undefined,
    hash: entry.hash,
    timezoneAdjustedDate: spacetime(entry.date).goto(timezone)
  }))[0];
}
