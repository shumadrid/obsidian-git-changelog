// Import { compile } from "@gerhobbelt/gitignore-parser";

import type { ReadonlyDeep } from 'type-fest';

import { EXCLUDE_FILES_AND_FOLDERS } from 'constants.ts';
import { SettingComponent } from 'settings/components/setting.ts';

export class ExcludeFilesAndFolders extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText(EXCLUDE_FILES_AND_FOLDERS);
          fragment
            .createEl('span', {
              cls: 'nav-file-tag git-changelog-experimental'
            })
            .setText('EXPERIMENTAL');
        })
      )
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            "Items listed here will still be committed to your repository but won't be included in the vault changelog."
          );
          fragment.createEl('br');
          fragment.appendText('Use the same ');
          fragment.createEl('a', {
            href: 'https://gitcheatsheet.org/how-to/git-gitignore',
            text: 'syntax'
          });
          fragment.appendText(
            ' as .gitignore, but note that negation patterns are not yet supported.'
          );
          fragment.createEl('br');
          fragment.appendText('The main .gitignore file still applies.');
          fragment.createEl('br');
          fragment.appendText("Don't forget to put .md for markdown files.");
        })
      )
      .addToggle((toggle) => {
        this.settingTab.bind(toggle, 'enableExclusionList', {
          onChanged: () => {
            this.refreshDisplayWithDelay();
          }
        });
        toggle.setTooltip(
          `List is ${toggle.getValue() ? 'enabled' : 'temporarily disabled'}`
        );
      })
      .addTextArea((text) => {
        text.setDisabled(!this.plugin.settings.enableExclusionList);
        if (!this.plugin.settings.enableExclusionList) {
          text.inputEl.addClass('git-changelog-disabled');
        }

        this.settingTab.bind(text, 'excludeFilesAndFoldersLines', {
          componentToPluginSettingsValueConverter: (uiValue) =>
            splitExcludeItems(uiValue),

          pluginSettingsToComponentValueConverter: (pluginSettingsValue) =>
            joinExcludeItems(pluginSettingsValue)
        });

        text.inputEl.classList.add('git-changelog-text-area');
      });
  }
}

export function convertPathToGitIgnoreRule(path: string): string {
  // First escape special characters (except whitespace), so that git doesn't interpret them as such.
  const escaped = path.replaceAll(/(?<temp1>[\\!#*?[\]])/g, String.raw`\$1`);

  // Then escape the last trailing whitespace character, because git trims unescaped trailing whitespace from the end of the line.
  // Files normally end with a file extension, not whitespace, but a file with trailing whitespace can appear if Obsidian's "Detect all file extensions" setting is turned on.
  return escaped.replaceAll(/\s(?=\s*$)/g, String.raw`\ `);
}

export function joinExcludeItems(items: readonly string[]): string {
  return items.join('\n');
}

export function splitExcludeItems(items: string): string[] {
  return items.split('\n');
}

// Trim trailing spaces that aren't preceded by a backslash before you apply gitignore to pathspec transformations.
export function parseGitIgnoreLine(gitIgnoreLine: string): string {
  // This regex will match trailing spaces that are not preceded by a backslash and stop trimming when a backslash is encountered
  return gitIgnoreLine
    .replace(/(?<!\\)\s+$/, '')
    .replace(/\\\s*$/, String.raw`\ `);
}

export function convertGitIgnoreToPathspec(
  gitIgnoreRules: ReadonlyDeep<string[]>,
  include: boolean
): string[] {
  try {
    const items: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
    const excludePrefix = include === true ? '' : 'exclude,';

    for (const line of gitIgnoreRules.map((element) =>
      parseGitIgnoreLine(element)
    )) {
      if (!isValidGitIgnoreRule(line) || line.startsWith('!')) {
        continue;
      }

      const formatted = convertGitIgnoreRuleToPathspec(line);

      // Handle patterns differently based on their format:
      if (line.endsWith('/*')) {
        // Single-level match
        items.push(`:(${excludePrefix}glob)${formatted}`);
      } else if (line.endsWith('/**') || line.endsWith('/')) {
        // Recursive match
        items.push(`:(${excludePrefix}glob)${formatted}`);
      } else {
        // All other patterns - match both item and contents
        // Regardless of whether they contain special characters
        items.push(
          `:(${excludePrefix}glob)${formatted}`,
          `:(${excludePrefix}glob)${formatted}/**`
        );
      }
    }
    return items;
  } catch {
    return [];
  }
}

export function isValidGitIgnoreRule(parsedGitIgnoreLine: string): boolean {
  // Empty lines are not valid rules
  if (!parsedGitIgnoreLine || parsedGitIgnoreLine.trim().length === 0) {
    return false;
  }

  // Comments are not valid rules
  if (parsedGitIgnoreLine.startsWith('#')) {
    return false;
  }

  if (
    parsedGitIgnoreLine.includes('//') ||
    parsedGitIgnoreLine.includes('**/**')
  ) {
    return false;
  }

  // Hardcoded checking for problematic patterns
  if (
    /^[./]*$/.test(parsedGitIgnoreLine) || // Matches '.', '..', '/', './', '../', etc.
    parsedGitIgnoreLine === '/' || // Root directory
    /^\.{2,}\/.*$/.test(parsedGitIgnoreLine) // Anything starting with multiple dots and slash
  ) {
    return false;
  }

  return true;
}

// Works well for the usual cases. Doesn't try to handle all edge cases yet.
function convertGitIgnoreRuleToPathspec(parsedGitIgnoreLine: string): string {
  // Handle root-relative paths
  let rootRelative = false;
  if (parsedGitIgnoreLine.startsWith('/')) {
    rootRelative = true;
    parsedGitIgnoreLine = parsedGitIgnoreLine.slice(1);
  }

  // For non-root patterns, prefix with **/ for a recursive match
  if (
    !rootRelative &&
    !parsedGitIgnoreLine.startsWith('*/') &&
    !parsedGitIgnoreLine.startsWith('**/')
  ) {
    parsedGitIgnoreLine = `**/${parsedGitIgnoreLine}`;
  }

  // If the pattern ends with a slash, add '**' for directory contents
  if (
    parsedGitIgnoreLine.endsWith('/') &&
    !parsedGitIgnoreLine.endsWith('*/')
  ) {
    parsedGitIgnoreLine += '**';
  }

  return parsedGitIgnoreLine;
}
