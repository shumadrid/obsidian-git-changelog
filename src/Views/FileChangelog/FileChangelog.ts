import type GitChangelogPlugin from 'main.ts';
import type { WorkspaceLeaf } from 'obsidian';

import { ItemView } from 'obsidian';
import { mount, unmount } from 'svelte';

import FileChangelogComponent from './FileChangelog.svelte';

export const FILE_CHANGELOG_VIEW_CONFIG = {
  icon: 'file-clock',
  name: 'File Changelog',
  type: 'file-changelog-view'
};

export class FileChangelogView extends ItemView {
  public plugin: GitChangelogPlugin;
  private _view: FileChangelogComponent | undefined = undefined;

  public constructor(leaf: WorkspaceLeaf, plugin: GitChangelogPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.navigation = false;
  }

  public async destroy(): Promise<void> {
    if (this._view) {
      await unmount(this._view);
      this._view = undefined;
    }
  }

  public override getDisplayText(): string {
    return FILE_CHANGELOG_VIEW_CONFIG.name;
  }

  public override getIcon(): string {
    return FILE_CHANGELOG_VIEW_CONFIG.icon;
  }

  public override getViewType(): string {
    return FILE_CHANGELOG_VIEW_CONFIG.type;
  }

  public override async onClose(): Promise<void> {
    await this.destroy();

    return super.onClose();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public override async onOpen(): Promise<void> {
    this._view = mount(FileChangelogComponent, {
      props: {
        plugin: this.plugin
      },
      target: this.contentEl
    }) as FileChangelogComponent;
  }

  public override onunload(): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.destroy();
  }
}
