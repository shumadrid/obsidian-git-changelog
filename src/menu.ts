import type GitChangelogPlugin from 'main.ts';
import type { MenuItem, WorkspaceLeaf } from 'obsidian';

import { COPY_COMMIT_HASH_ICON, PLUGIN_NAME_SENTENCE_CASE } from 'constants.ts';
import { Menu, TFolder } from 'obsidian';
import {
  convertPathToGitIgnoreRule,
  parseGitIgnoreLine
} from 'settings/ui/ExcludeFilesAndFolders.ts';
import { fileOpenableInObsidian } from 'Views/helper.ts';
import { VAULT_CHANGELOG_VIEW_CONFIG } from 'Views/VaultChangelog/VaultChangelog.ts';

export function addContextMenuItems(plugin: GitChangelogPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu, file) => {
      menu.addItem((item) => {
        const gitRelativePath = plugin
          .getGitPlugin()
          .gitManager.getRelativeRepoPath(file.path, true);

        addExcludeMenuItem({
          item,
          isFolder: file instanceof TFolder,
          gitRelativePath,
          plugin
        });
      });
    })
  );

  plugin.registerEvent(
    plugin.app.workspace.on(
      'git-changelog:menu',
      (menu, inFileMenu, gitRelativePath, commitHash) => {
        handleChangelogViewContextMenu({
          menu,
          inFileMenu,
          gitRelativePath,
          commitHash,
          plugin
        });
      }
    )
  );
}

export function mayTriggerChangelogMenu({
  event,
  gitRelativePath,
  commitHash,
  view,
  plugin
}: {
  event: MouseEvent;
  gitRelativePath?: string;
  commitHash?: string;
  view: WorkspaceLeaf;
  plugin: GitChangelogPlugin;
}): void {
  // eslint-disable-next-line eqeqeq
  if (event.button == 2) {
    const fileMenu = new Menu();
    let showFileMenu = false;
    // Check if it's a file right click.
    if (gitRelativePath !== undefined) {
      const vaultRelativePath = plugin
        .getGitPlugin()
        .gitManager.getRelativeVaultPath(gitRelativePath);
      const tFile = plugin.app.vault.getAbstractFileByPath(vaultRelativePath);

      // If the target file is a file that currently exists in the vault, open the usual file menu.
      showFileMenu = fileOpenableInObsidian({
        relativeVaultPath: tFile?.path,
        plugin
      });
      if (showFileMenu) {
        plugin.app.workspace.trigger(
          'file-menu',
          fileMenu,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          tFile!,
          view.view.getViewType(),
          view
        );
      }
    }

    // Append the git-changelog menu items to the file menu.
    plugin.app.workspace.trigger(
      'git-changelog:menu',
      fileMenu,
      showFileMenu,
      gitRelativePath,
      commitHash
    );
    fileMenu.showAtPosition({ x: event.pageX, y: event.pageY });
  }
}

export function addExcludeMenuItem({
  item,
  isFolder,
  plugin,
  gitRelativePath
}: {
  item: MenuItem;
  isFolder: boolean;
  gitRelativePath: string;
  plugin: GitChangelogPlugin;
}): void {
  // The ExcludeFilesAndFolders rules are applied relative to the git repo.

  // Only check absolute rules, we don't want to modify any relative rules that also affect other files
  const lineNumber = isAbsolutePathInExcludeFilesAndFolders({
    isFolder,
    gitRelativePath,
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
            gitRelativePath,
            isFolder,
            plugin
          }));
    });
}

export function handleChangelogViewContextMenu({
  menu,
  inFileMenu,
  gitRelativePath,
  commitHash,
  plugin
}: {
  menu: Menu;
  inFileMenu: boolean;
  gitRelativePath?: string;
  commitHash?: string;
  plugin: GitChangelogPlugin;
}): void {
  // Skip adding the "Git changelog: Exclude" item again if the usual file menu is shown.
  if (!inFileMenu && gitRelativePath) {
    menu.addItem((item) => {
      addExcludeMenuItem({
        item,
        isFolder: false,
        gitRelativePath,
        plugin
      });
    });
  }

  if (commitHash) {
    let itemTitle = 'Copy commit hash';
    let contentToCopy = commitHash;

    // If used on a file tile inside changelog versions.
    if (gitRelativePath) {
      itemTitle += `:path`;
      contentToCopy += `:${gitRelativePath}`;
    }
    menu.addItem((item) => {
      item
        .setTitle(itemTitle)
        .setSection('action')
        .setIcon(COPY_COMMIT_HASH_ICON)
        .onClick(async () => {
          await navigator.clipboard.writeText(contentToCopy);
          plugin.displayNotice(
            `Commit information ${contentToCopy} copied to clipboard.`,
            // eslint-disable-next-line no-magic-numbers
            1000
          );
        });
    });
  }
}

export function convertPathToAbsoluteGitIgnoreRule({
  isFolder,
  gitRelativePath
}: {
  isFolder: boolean;
  gitRelativePath: string;
}): string {
  // Add a leading slash to set the rule as absolute from root, so it only excludes that exact path
  let composedPath = '/';

  composedPath += gitRelativePath;

  // Add an explicit folder rule, so that the same path doesn't also apply for files with that same name
  if (isFolder) {
    composedPath += '/';
  }

  return convertPathToGitIgnoreRule(composedPath);
}

export function isAbsolutePathInExcludeFilesAndFolders({
  isFolder,
  gitRelativePath,
  plugin
}: {
  isFolder: boolean;
  gitRelativePath: string;
  plugin: GitChangelogPlugin;
}): number {
  const gitIgnoreAbsoluteRule = convertPathToAbsoluteGitIgnoreRule({
    isFolder,
    gitRelativePath
  });
  const existingLines =
    plugin.settingsClone.vaultChangelogGenerationSettings
      .excludeFilesAndFoldersLines;

  // Trim unescaped trailing white space from existing lines, since it gets trimmed by git anyways.
  // By doing this we won't miss already existing lines that only differ in trailing white space.
  const existingRules = existingLines.map((line) => parseGitIgnoreLine(line));
  return existingRules.indexOf(gitIgnoreAbsoluteRule);
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

export async function addExcludeFilesAndFoldersItem({
  gitRelativePath,
  isFolder,
  plugin
}: {
  gitRelativePath: string;
  isFolder: boolean;
  plugin: GitChangelogPlugin;
}): Promise<void> {
  const gitIgnoreRule = convertPathToAbsoluteGitIgnoreRule({
    gitRelativePath,
    isFolder
  });

  const newSettings = plugin.settingsClone;
  newSettings.vaultChangelogGenerationSettings.excludeFilesAndFoldersLines.push(
    gitIgnoreRule
  );

  await plugin.saveSettings(newSettings);
}
