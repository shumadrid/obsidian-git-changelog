import type { Plugin } from 'obsidian';
import type { SimpleGit } from 'simple-git';

// For clearer compatibility:
// Import { type SimpleGit as SimpleGitType } from "simple-git";

export interface GitManager {
  getRelativeRepoPath(filePath: string, doConversion: boolean): string;
  getRelativeVaultPath(path: string): string;

  git: SimpleGit;
}

export interface ObsidianGitPlugin extends Plugin {
  gitManager: GitManager;
  isAllInitialized(): Promise<boolean>;
  settings: ObsidianGitSettings;

  tools: Tools;
}

export interface ObsidianGitSettings {
  autoSaveInterval: number;
}

export interface Tools {
  openDiff({
    aFile,
    aRef,
    bFile,
    bRef,
    event
  }: {
    aFile: string;
    aRef: string;
    bFile?: string;
    bRef?: string;
    event?: MouseEvent;
  }): void;
}

// Interface DiffViewState {
//   AFile: string;
//   ARef?: string;
//   BFile: string;
//   BRef?: string;
// }

declare module 'obsidian' {
  interface App {
    plugins: {
      getPlugin(id: string): Plugin | undefined;
      plugins: {
        'obsidian-git': ObsidianGitPlugin;
      };
    };
  }

  interface Workspace {
    on(
      name: 'obsidian-git:head-change',
      callback: () => void,
      context?: unknown
    ): EventRef;

    on(
      name: 'obsidian-git:menu',
      callback: (
        menu: Menu,
        path: string,
        source: string,
        leaf?: WorkspaceLeaf
      ) => unknown,
      context?: unknown
    ): EventRef;
    trigger(name: string, ...data: unknown[]): void;

    trigger(
      name: 'obsidian-git:menu',
      menu: Menu,
      path: string,
      source: string,
      leaf?: WorkspaceLeaf
    ): void;
  }
}
