import type GitChangelogPlugin from 'main.ts';
import type { LogEntry } from 'types.ts';

import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import spacetime from 'spacetime';
import { AbortError } from 'types.ts';

export async function findFirstCommitBefore({
  abortSignal,
  minutes,
  plugin
}: {
  abortSignal: AbortSignal;
  minutes: number;
  plugin: GitChangelogPlugin;
}): Promise<LogEntry | undefined> {
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

  if (abortSignal.aborted) {
    throw new AbortError();
  }
  const git = await plugin.getGit();
  const result = await git.log(options);
  const timezone = getTimeZone(
    plugin.settings.changelogGenerationSettings,
    plugin
  );

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
    timezoneAdjustedDate: spacetime(entry.date).goto(timezone)
  }))[0];
}
