import type GitChangelogPlugin from 'main.ts';
import type { MenuItem } from 'obsidian';

import { PLUGIN_NAME_SENTENCE_CASE } from 'constants.ts';
import { TFolder } from 'obsidian';
import {
  convertPathToGitIgnoreRule,
  parseGitIgnoreLine
} from 'settings/ui/ExcludeFilesAndFolders.ts';
import { VAULT_CHANGELOG_VIEW_CONFIG } from 'Views/VaultChangelog/VaultChangelog.ts';

export async function addExcludeFilesAndFoldersItem({
  path,
  isFolder,
  plugin
}: {
  path: string;
  isFolder: boolean;
  plugin: GitChangelogPlugin;
}): Promise<void> {
  const gitIgnoreRule = composeAbsoluteGitIgnoreRuleFromPath({
    path,
    isFolder
  });

  const newSettings = plugin.settingsClone;
  newSettings.vaultChangelogGenerationSettings.excludeFilesAndFoldersLines.push(
    gitIgnoreRule
  );
  await plugin.saveSettings(newSettings);
}

export async function removeExcludeFilesAndFoldersItem(
  lineNumber: number,
  plugin: GitChangelogPlugin
): Promise<void> {
  const newSettings = plugin.settingsClone;
  newSettings.vaultChangelogGenerationSettings.excludeFilesAndFoldersLines.splice(
    lineNumber,
    1
  );
  await plugin.saveSettings(newSettings);
}

export function composeAbsoluteGitIgnoreRuleFromPath({
  isFolder,
  path
}: {
  isFolder: boolean;
  path: string;
}): string {
  // Add a leading slash to set the rule as absolute from root, so it only excludes that exact path
  let composedPath = '/';

  composedPath += path;

  // Add an explicit folder rule, so that the same path doesn't also apply for files with that same name
  if (isFolder) {
    composedPath += '/';
  }

  return convertPathToGitIgnoreRule(composedPath);
}

export function isAbsolutePathInExcludeFilesAndFolders({
  isFolder,
  path,
  plugin
}: {
  isFolder: boolean;
  path: string;
  plugin: GitChangelogPlugin;
}): number {
  const gitIgnoreAbsoluteRule = composeAbsoluteGitIgnoreRuleFromPath({
    isFolder,
    path
  });
  const existingLines =
    plugin.settingsClone.vaultChangelogGenerationSettings
      .excludeFilesAndFoldersLines;

  // Trim unescaped trailing white space from existing lines, since it gets trimmed by git anyways.
  // By doing this we won't miss already existing lines that only differ in trailing white space.
  const existingRules = existingLines.map((line) => parseGitIgnoreLine(line));
  return existingRules.indexOf(gitIgnoreAbsoluteRule);
}

export function addFileMenuItems(plugin: GitChangelogPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu, file) => {
      menu.addItem((item) => {
        addExcludeMenuItem({
          item,
          isFolder: file instanceof TFolder,
          vaultRelativePath: file.path,
          plugin
        });
      });
    })
  );

  plugin.registerEvent(
    plugin.app.workspace.on('obsidian-git:menu', (menu, path) => {
      menu.addItem((item) => {
        addExcludeMenuItem({
          item,
          isFolder: false,
          vaultRelativePath: path,
          plugin
        });
      });
    })
  );
}

export function addExcludeMenuItem({
  item,
  isFolder,
  plugin,
  vaultRelativePath
}: {
  item: MenuItem;
  isFolder: boolean;
  vaultRelativePath: string;
  plugin: GitChangelogPlugin;
}): void {
  // The ExcludeFilesAndFolders rules are applied relative to the git repo.
  const path = plugin
    .getGitPlugin()
    .gitManager.getRelativeRepoPath(vaultRelativePath, true);
  // Only check absolute rules, we don't want to modify any relative rules that also affect other files
  const lineNumber = isAbsolutePathInExcludeFilesAndFolders({
    isFolder,
    path,
    plugin
  });
  const ruleAlreadyExists = lineNumber !== -1;
  const actionTitle = ruleAlreadyExists ? 'Reinclude' : 'Exclude';

  item
    .setSection('action')
    .setTitle(`${PLUGIN_NAME_SENTENCE_CASE}: ${actionTitle}`)
    .setIcon(VAULT_CHANGELOG_VIEW_CONFIG.icon)
    .onClick(async () => {
      await (ruleAlreadyExists
        ? removeExcludeFilesAndFoldersItem(lineNumber, plugin)
        : addExcludeFilesAndFoldersItem({
            path,
            isFolder,
            plugin
          }));
    });
}
