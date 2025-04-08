import type { SimpleGit } from 'simple-git';

export async function runHashObjectEmptyTree({
  git
}: {
  git: SimpleGit;
}): Promise<string> {
  const emptyTreeHash = await git.raw([
    'hash-object',
    '-t',
    'tree',
    '/dev/null'
  ]);

  // Trimming is required.
  return emptyTreeHash.trim();
}
