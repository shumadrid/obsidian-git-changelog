import type GitChangelogPlugin from 'main.ts';
import type { WorkspaceLeaf } from 'obsidian';
import type { GitChangelogSettings } from 'settings/settings.ts';

import { COPY_COMMIT_HASH_ICON, PLUGIN_NAME_SENTENCE_CASE } from 'constants.ts';
import { Menu, TFolder } from 'obsidian';
import {
  convertPathToGitIgnoreRule,
  parseGitIgnoreLine
} from 'settings/ui/ExcludeFilesAndFolders.ts';
import { assertNotNull } from 'utils.ts';
import { fileOpenableInObsidian } from 'Views/helper.ts';
import { VAULT_CHANGELOG_VIEW_CONFIG } from 'Views/VaultChangelog/VaultChangelog.ts';

export function addContextMenuItems(plugin: GitChangelogPlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu, file) => {
      const gitRelativePath = plugin
        .getGitPlugin()
        .gitManager.getRelativeRepoPath(file.path, true);

      addExcludeMenuItem({
        menu,
        isFolder: file instanceof TFolder,
        gitRelativePath,
        plugin
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
          assertNotNull(tFile),
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

/**
 * Check if the path is a relative path that goes above the root of the repository.
 *
 * If it starts with any number of /../, that means it's above the root.
 *
 * This is parsing the output of getRelativeRepoPath function.
 *
 * "../" is acceptable. (Non-absolute path)
 */
function isAbsoluteGitIgnoreRuleAboveRoot({
  absoluteGitIgnoreRule
}: {
  absoluteGitIgnoreRule: string;
}): boolean {
  return absoluteGitIgnoreRule.startsWith('/../');
}

export function addExcludeMenuItem({
  menu,
  isFolder,
  plugin,
  gitRelativePath
}: {
  menu: Menu;
  isFolder: boolean;
  gitRelativePath: string;
  plugin: GitChangelogPlugin;
}): void {
  const absoluteGitIgnoreRule = convertPathToAbsoluteGitIgnoreRule({
    isFolder,
    gitRelativePath
  });
  // Don't add the menu item if the path is above the root of the repository. Otherwise git would throw this error when trying to use this rule in pathspec:
  // Fatal: :(exclude,glob)../xx/**: '../xx/**' is outside repository at '/path/to/vault/repo'
  if (isAbsoluteGitIgnoreRuleAboveRoot({ absoluteGitIgnoreRule })) {
    return;
  }

  menu.addItem((item) => {
    // The ExcludeFilesAndFolders rules are applied relative to the git repo.

    // Only check absolute rules, we don't want to modify any relative rules that also affect other files
    const lineNumber = isAbsoluteGitIgnoreRuleInExcludeFilesAndFolders({
      absoluteGitIgnoreRule,
      plugin
    });
    const ruleAlreadyExists = lineNumber !== -1;
    const isIncludeList = plugin.settings.convertToIncludeList;
    let actionTitle: string;
    if (isIncludeList) {
      actionTitle = ruleAlreadyExists ? 'Re-exclude' : 'Include';
    } else {
      actionTitle = ruleAlreadyExists ? 'Reinclude' : 'Exclude';
    }

    item
      .setSection('action')
      .setTitle(`${PLUGIN_NAME_SENTENCE_CASE}: ${actionTitle}`)
      .setIcon(VAULT_CHANGELOG_VIEW_CONFIG.icon)
      .onClick(async () => {
        await (ruleAlreadyExists
          ? removeExcludeFilesAndFoldersItem(lineNumber, plugin)
          : addExcludeFilesAndFoldersItem({
              path: absoluteGitIgnoreRule,
              plugin
            }));
      });
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
    addExcludeMenuItem({
      menu,
      isFolder: false,
      gitRelativePath,
      plugin
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

/**
 * Checks if a given absolute gitignore rule exists in the plugin's exclude files and folders settings
 * @param gitIgnoreAbsoluteRule - The absolute gitignore rule to check for
 * @param plugin - The GitChangelogPlugin instance
 * @returns The line number (index) where the rule was found, or -1 if not found
 */
export function isAbsoluteGitIgnoreRuleInExcludeFilesAndFolders({
  absoluteGitIgnoreRule,
  plugin
}: {
  absoluteGitIgnoreRule: string;
  plugin: GitChangelogPlugin;
}): number {
  const existingLines = plugin.settings.excludeFilesAndFoldersLines;

  // Trim unescaped trailing white space from existing lines, since it gets trimmed by git anyways.
  // By doing this we won't miss already existing lines that only differ in trailing white space.
  const existingRules = existingLines.map((line) => parseGitIgnoreLine(line));
  return existingRules.indexOf(absoluteGitIgnoreRule);
}

export async function removeExcludeFilesAndFoldersItem(
  lineNumber: number,
  plugin: GitChangelogPlugin
): Promise<void> {
  await plugin.settingsManager.editAndSave(
    (settings: GitChangelogSettings): void => {
      settings.excludeFilesAndFoldersLines.splice(lineNumber, 1);
    }
  );
}

export async function addExcludeFilesAndFoldersItem({
  path,
  plugin
}: {
  path: string;
  plugin: GitChangelogPlugin;
}): Promise<void> {
  await plugin.settingsManager.editAndSave(
    (settings: GitChangelogSettings): void => {
      settings.excludeFilesAndFoldersLines.push(path);
    }
  );
}
