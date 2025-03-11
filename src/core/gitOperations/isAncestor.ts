import type GitChangelogPlugin from 'main.ts';

/**
 * Doesn't work because of the way SimpleGit instance is set up in Git plugin.
 */
export async function isAncestorOf({
  newCommit,
  oldCommit,
  plugin
}: {
  newCommit: string;
  oldCommit: string;
  plugin: GitChangelogPlugin;
}): Promise<boolean> {
  if (oldCommit === newCommit) {
    return true;
  }
  const git = await plugin.getGit();

  const result = await git.raw([
    'merge-base',
    '--is-ancestor',
    oldCommit,
    newCommit
  ]);
  // Plugin.consoleDebug(result);

  if (result === '1') {
    return true;
  }
  return false;
}
