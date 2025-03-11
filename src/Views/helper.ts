import type { ItemView } from 'obsidian';
import type { ChangelogEntry } from 'Views/types.svelte.ts';

import { appendChangelogEntries } from 'core/loadingEntries.ts';
import { MarkdownView, TFile } from 'obsidian';
import {
  changelogGenerationSettingsUnchanged,
  fileChangelogGenerationSettingsUnchanged,
  vaultChangelogGenerationSettingsUnchanged
} from 'settings/helper.ts';

import type GitChangelogPlugin from '../main.ts';
import type { DiffFile } from '../types.ts';

import { getNewLeaf } from '../utils.ts';

export async function appendEntries({
  abortSignal,
  entries,
  fileOrVault,
  plugin
  // RecomputeChangelog
}: {
  abortSignal: AbortSignal;
  entries: ChangelogEntry[] | undefined;
  fileOrVault: 'file' | 'vault';
  plugin: GitChangelogPlugin;
  // RecomputeChangelog: () => Promise<void>;
}): Promise<void> {
  if (
    (fileOrVault === 'file'
      ? fileChangelogGenerationSettingsUnchanged(plugin)
      : vaultChangelogGenerationSettingsUnchanged(plugin)) &&
    changelogGenerationSettingsUnchanged(plugin)
  ) {
    await appendChangelogEntries({
      abortSignal,
      fileOrVault,
      filePath: fileOrVault === 'file' ? getCurrentFilePath(plugin) : undefined,
      plugin,
      resetCache: entries === undefined,
      upperBoundaryCommit: getUpperBoundaryCommit(entries)
    });
  }
  // : recomputeChangelog());
}

export function changelogFileClick(
  event: MouseEvent,
  file: DiffFile,
  plugin: GitChangelogPlugin,
  aReference?: string,
  bReference?: string
): void {
  event.stopPropagation();
  if (file.textDiffStats && aReference && bReference) {
    // Show the diff that compares that version to the version from the previous day or if some other interval were specified

    showDiff(event, file, plugin, aReference, bReference);
  }
}

export function getActiveGitFileFromView(
  activeFileView: MarkdownView | null,
  plugin: GitChangelogPlugin
): string | undefined {
  if (activeFileView?.file) {
    const gitPlugin = plugin.getGitPlugin();
    return gitPlugin.gitManager.getRelativeRepoPath(
      activeFileView.file.path,
      true
    );
  }
}

export function getActiveGitRelativeFile(
  plugin: GitChangelogPlugin
): string | undefined {
  const activeFileView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  return getActiveGitFileFromView(activeFileView, plugin);
}

export function getCurrentFilePath(
  plugin: GitChangelogPlugin
): string | undefined {
  return plugin.fileChangelogEntries === undefined ||
    plugin.fileChangelogEntries.length === 0
    ? plugin.cachedActiveGitFile
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      plugin.fileChangelogEntries.at(-1)!.pathGitRelative;
}

export function getDisplayPath(path: string): string {
  if (path.endsWith('/')) {
    return path;
  }
  return path.split('/').last()?.replace(/\.md$/, '') ?? '';
}

export function getUpperBoundaryCommit(
  entries: ChangelogEntry[] | undefined
): string | undefined {
  if (entries !== undefined && entries.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return entries.at(-1)!.commitHash;
  }
}

export function initialCommitReached({
  entries
}: {
  entries?: ChangelogEntry[];
}): boolean {
  if (entries && (entries.length === 0 || entries.at(-1)?.isInitialCommit())) {
    return true;
  }

  return false;
}

export function isDiffView(view: ItemView | null): boolean {
  return (
    view?.getViewType() === 'diff-view' ||
    view?.getViewType() === 'split-diff-view'
  );
}

export function openFile({
  event,
  file,
  plugin,
  relativeVaultPath
}: {
  event: MouseEvent;
  file: DiffFile;
  plugin: GitChangelogPlugin;
  relativeVaultPath: string;
}): void {
  event.stopPropagation();
  const obsidianFile =
    plugin.app.vault.getAbstractFileByPath(relativeVaultPath);

  if (obsidianFile instanceof TFile) {
    getNewLeaf(plugin.app, event)
      ?.openFile(obsidianFile)
      .catch((error) => {
        plugin.displayError(error);
      });
  } else if (relativeVaultPath === undefined) {
    if (file.fromPathGitRelative) {
      plugin.displayNotice(
        "Can't open this version of the file because it doesn't exist in the vault anymore."
      );
    } else {
      plugin.displayNotice('This is the initial version. No diff to show.');
    }
  } else if (obsidianFile === undefined) {
    plugin.displayNotice(`Can't open ${file.pathGitRelative}.`);
  }
}

// Assumes this function won't be called if you want to show diff of the initial version
export function showDiff(
  event: MouseEvent,
  file: DiffFile,
  plugin: GitChangelogPlugin,
  aReference: string,
  bReference: string
): void {
  plugin.getGitPlugin().tools.openDiff({
    aFile: file.fromPathGitRelative ?? file.pathGitRelative,
    aRef: aReference,
    bFile: file.pathGitRelative,
    bRef: bReference,
    event
  });
}
