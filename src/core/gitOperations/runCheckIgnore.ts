import type GitChangelogPlugin from 'main.ts';

export async function runCheckIgnore({
  activeGitFile,
  plugin
}: {
  activeGitFile: string;
  plugin: GitChangelogPlugin;
}): Promise<boolean> {
  const gitCheckIgnoreResult = await plugin
    .getGitPlugin()
    .gitManager.git.checkIgnore(activeGitFile);

  return !gitCheckIgnoreResult || gitCheckIgnoreResult.length > 0;
}
