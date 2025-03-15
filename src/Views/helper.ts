import type { ItemView } from 'obsidian';

import { MarkdownView, TFile } from 'obsidian';

import type GitChangelogPlugin from '../main.ts';
import type { DiffFile } from '../types.ts';

import { getNewLeaf } from '../utils.ts';

export function changelogFileClick({
  aReference,
  bReference,
  event,
  file,
  plugin
}: {
  aReference: string;
  bReference: string;
  event: MouseEvent;
  file: DiffFile;
  plugin: GitChangelogPlugin;
}): void {
  if (canOpenInDiffView({ aReference, bReference, file })) {
    // Show the diff that compares that version to the version from the previous day or if some other interval were specified

    showDiff(event, file, plugin, aReference, bReference);
  }
}

export function canOpenInDiffView({
  aReference,
  bReference,
  file
}: {
  aReference?: string;
  bReference?: string;
  file: DiffFile;
}): boolean {
  return !!(file.textDiffStats && aReference && bReference);
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

// Use this function to get the active file over plugin.activeGitFile if you don't want to get an error if the active file changed.
export function getActiveGitRelativeFile(
  plugin: GitChangelogPlugin
): string | undefined {
  const activeFileView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
  return getActiveGitFileFromView(activeFileView, plugin);
}

export function getDisplayPath(path: string): string {
  if (path.endsWith('/')) {
    return path;
  }
  return path.split('/').last()?.replace(/\.md$/, '') ?? '';
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
  file?: DiffFile;
  plugin: GitChangelogPlugin;
  relativeVaultPath: string;
}): void {
  const obsidianFile =
    plugin.app.vault.getAbstractFileByPath(relativeVaultPath);

  if (obsidianFile instanceof TFile) {
    getNewLeaf(plugin.app, event)
      ?.openFile(obsidianFile)
      .catch((error) => {
        plugin.displayError(error);
      });
  } else if (obsidianFile === undefined) {
    const fileNameToShow = file?.pathGitRelative ?? relativeVaultPath;
    plugin.displayNotice(`Can't open ${fileNameToShow}.`);
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
