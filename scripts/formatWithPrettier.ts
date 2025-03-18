import { getDirname } from 'obsidian-dev-utils/Path';
import { existsSync } from 'obsidian-dev-utils/ScriptUtils/NodeModules';
import {
  execFromRoot,
  getRootDir,
  resolvePathFromRootSafe
} from 'obsidian-dev-utils/ScriptUtils/Root';

export async function formatWithPrettier(rewrite: boolean): Promise<void> {
  // Modified from https://github.com/mnaoumov/obsidian-dev-utils/blob/main/src/ScriptUtils/format.ts

  const prettierJsonPath = resolvePathFromRootSafe('.prettierrc.json');
  if (!existsSync(prettierJsonPath)) {
    const packageDirectory = getRootDir(getDirname(import.meta.url));
    if (!packageDirectory) {
      throw new Error('Could not find package directory.');
    }
    throw new Error('.prettierrc.json not found');
  }

  const command = rewrite ? '--write' : '--check';
  await execFromRoot(['npx', 'prettier', '.', command]);
}
