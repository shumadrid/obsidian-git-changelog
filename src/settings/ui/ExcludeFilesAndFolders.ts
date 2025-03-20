// Import { compile } from "@gerhobbelt/gitignore-parser";

import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';

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
            this.plugin.settings.vaultChangelogGenerationSettings
              .gitDiffIgnore ??
              DEFAULT_SETTINGS.vaultChangelogGenerationSettings.gitDiffIgnore
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.vaultChangelogGenerationSettings.gitDiffIgnore = value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);
          });
        text.inputEl.classList.add('git-changelog-text-area');
      });
  }
}

/**
 * Doesn't work properly, using same gitignore for all submodules for now
 */
export function adjustGitignoreForSubmodule(
  gitignoreContent: string,
  submodulePath: string
): string {
  // Ensure submodulePath ends with a slash for matching purposes.
  if (!submodulePath.endsWith('/')) {
    submodulePath += '/';
  }

  // Regex for detecting glob characters.
  const globRegex = /[*?[\]]/;

  const lines = gitignoreContent.split('\n');
  const adjustedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Keep blank lines and comments unchanged.
    if (trimmed === '' || trimmed.startsWith('#')) {
      adjustedLines.push(line);
      continue;
    }

    let isNegation = false;
    let rule = trimmed;

    // Handle negation: remove the leading "!" for processing.
    if (rule.startsWith('!')) {
      isNegation = true;
      rule = rule.slice(1).trim();
    }

    // If the rule explicitly starts with the submodule path,
    // Remove that prefix so it is relative to the submodule.
    if (rule.startsWith(submodulePath)) {
      const adjustedRule = rule.slice(submodulePath.length);
      adjustedLines.push(isNegation ? `!${adjustedRule}` : adjustedRule);
    } else if (globRegex.test(rule)) {
      // If the rule doesn't start with the submodule path...
      // - If it is hardcoded (no glob characters), drop it.
      // - If it contains globs, leave it intact.
      adjustedLines.push(line); // Leave the original rule unchanged.
      // Else: hardcoded rule outside the submodule is omitted.
    }
  }

  // Remove any empty lines which might have resulted from omitting rules.
  return adjustedLines.filter((l) => l.trim() !== '').join('\n');
}

export function convertGitIgnoreToPathspec(
  plugin: GitChangelogPlugin
): string[] {
  const gitDiffIgnore =
    plugin.settings.vaultChangelogGenerationSettings.gitDiffIgnore;
  try {
    // Always exclude .git directory
    const excludes: string[] = [':(exclude,glob)**/.git/**'];
    const includes: string[] = [];

    for (const line of gitDiffIgnore
      .split('\n')
      .map((diffLine) => diffLine.trim())) {
      if (!(isValidGitIgnoreRule(line) && !line.startsWith('!'))) {
        continue;
      }

      const formatted = formatGitIgnoreToPathspec(line);

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

    return [...excludes, ...includes];
  } catch (error) {
    plugin.consoleDebug(`Error converting gitignore to pathspec: ${error}`);
    return [];
  }
}

export function isValidGitIgnoreRule(rule: string): boolean {
  if (!rule || rule.trim().length === 0) {
    return false;
  }
  if (rule.startsWith('#')) {
    return false;
  }

  // Strip leading negation if present
  const patternToCheck = rule.startsWith('!') ? rule.slice(1) : rule;
  const parts = patternToCheck.split('\\');
  for (let index = 0; index < parts.length - 1; index++) {
    if (/\s/.test(parts[index])) {
      return false;
    }
  }
  if (patternToCheck.includes('//') || patternToCheck.includes('**/**')) {
    return false;
  }

  // Quick check for square bracket balance
  const openBrackets = (patternToCheck.match(/\[/g) ?? []).length;
  const closeBrackets = (patternToCheck.match(/\]/g) ?? []).length;
  if (openBrackets !== closeBrackets) {
    return false;
  }

  // Hardcoded checking for problematic patterns
  if (
    /^[./]*$/.test(rule) || // Matches '.', '..', '/', './', '../', etc.
    rule === '/' || // Root directory
    /^\.{2,}\/.*$/.test(rule) // Anything starting with multiple dots and slash
  ) {
    return false;
  }

  return true;
}

function formatGitIgnoreToPathspec(pattern: string): string {
  pattern = pattern.trim();

  // Handle root-relative paths
  let rootRelative = false;
  if (pattern.startsWith('/')) {
    rootRelative = true;
    pattern = pattern.slice(1);
  }

  // For non-root patterns, prefix with **/ for a recursive match
  if (
    !rootRelative &&
    !pattern.startsWith('*/') &&
    !pattern.startsWith('**/')
  ) {
    pattern = `**/${pattern}`;
  }

  // If the pattern ends with a slash, add '**' for directory contents
  if (pattern.endsWith('/') && !pattern.endsWith('*/')) {
    pattern += '**';
  }

  return pattern;
}
