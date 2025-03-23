// Import { compile } from "@gerhobbelt/gitignore-parser";

import type { ReadonlyDeep } from 'type-fest';

import { GitChangelogSetting } from 'settings/components/setting.ts';
import { DEFAULT_SETTINGS } from 'settings/settings.ts';

export class ExcludeFilesAndFolders extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Exclude files and folders (experimental)')
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            "Items listed here will still be committed to your repository but won't be included in the vault changelog. Use the same "
          );
          fragment.createEl('a', {
            href: 'https://gitcheatsheet.org/how-to/git-gitignore',
            text: 'syntax'
          });
          fragment.appendText(
            " as .gitignore, but note that negation patterns are not yet supported. The main .gitignore file still applies. Don't forget to put .md for markdown files."
          );
        })
      )
      .addTextArea((text) => {
        text
          .setValue(
            joinExcludeItems(
              this.plugin.settingsClone.vaultChangelogGenerationSettings
                .excludeFilesAndFoldersLines ??
                DEFAULT_SETTINGS.vaultChangelogGenerationSettings
                  .excludeFilesAndFoldersLines
            )
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.vaultChangelogGenerationSettings.excludeFilesAndFoldersLines =
              splitExcludeItems(value);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });
        text.inputEl.classList.add('git-changelog-text-area');
      });
  }
}

export function convertPathToGitIgnoreRule(path: string): string {
  // First escape special characters (except whitespace)
  const escaped = path.replaceAll(/(?<temp1>[\\!#*?[\]])/g, String.raw`\$1`);

  // Then escape each trailing whitespace character individually, because git trims trailing whitespace
  // This scenario is possible if Obsidian's "Detect all file extensions" setting is turned on.
  return escaped.replaceAll(/\s(?=\s*$)/g, String.raw`\ `);
}

export function joinExcludeItems(items: string[]): string {
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
  gitIgnoreRules: ReadonlyDeep<string[]>
): string[] {
  try {
    // Always exclude .git directory
    const excludes: string[] = [':(exclude,glob)**/.git/**'];

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
        excludes.push(`:(exclude,glob)${formatted}`);
      } else if (line.endsWith('/**') || line.endsWith('/')) {
        // Recursive match
        excludes.push(`:(exclude,glob)${formatted}`);
      } else {
        // All other patterns - match both item and contents
        // Regardless of whether they contain special characters
        excludes.push(
          `:(exclude,glob)${formatted}`,
          `:(exclude,glob)${formatted}/**`
        );
      }
    }

    return excludes;
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
