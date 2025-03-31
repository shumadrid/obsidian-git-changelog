import type GitChangelogPlugin from 'main.ts';

async function runHashObjectEmptyTree({
  plugin
}: {
  plugin: GitChangelogPlugin;
}): Promise<string> {
  const git = await plugin.getGit();

  const emptyTreeHash = await git.raw([
    'hash-object',
    '-t',
    'tree',
    '/dev/null'
  ]);

  return emptyTreeHash.trim();
}

export async function getEmptyTreeHash({
  plugin
}: {
  plugin: GitChangelogPlugin;
}): Promise<string> {
  if (plugin.emptyTreeHash) {
    return plugin.emptyTreeHash;
  }

  const emptyTreeHash = await runHashObjectEmptyTree({ plugin });
  plugin.emptyTreeHash ??= emptyTreeHash;
  return plugin.emptyTreeHash;
}
