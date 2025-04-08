import type { SimpleGit } from 'simple-git';

/**
 * Doesn't work because of the way SimpleGit instance is set up in Git plugin.
 */
export async function isAncestorOf({
  newCommit,
  oldCommit,
  git
}: {
  newCommit: string;
  oldCommit: string;
  git: SimpleGit;
}): Promise<boolean> {
  if (oldCommit === newCommit) {
    return true;
  }

  const result = await git.raw([
    'merge-base',
    '--is-ancestor',
    oldCommit,
    newCommit
  ]);

  if (result === '1') {
    return true;
  }
  return false;
}
