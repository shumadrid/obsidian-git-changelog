import type GitChangelogPlugin from 'main.ts';
import type { WorkspaceLeaf } from 'obsidian';

import { ItemView } from 'obsidian';
import { mount, unmount } from 'svelte';

import VaultChangelogComponent from './VaultChangelog.svelte';

export const VAULT_CHANGELOG_VIEW_CONFIG = {
  icon: 'folder-clock',
  name: 'Vault changelog',
  type: 'vault-changelog-view'
};

export class VaultChangelogView extends ItemView {
  public plugin: GitChangelogPlugin;
  private _view: undefined | VaultChangelogComponent = undefined;

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
    return VAULT_CHANGELOG_VIEW_CONFIG.name;
  }

  public override getIcon(): string {
    return VAULT_CHANGELOG_VIEW_CONFIG.icon;
  }

  public override getViewType(): string {
    return VAULT_CHANGELOG_VIEW_CONFIG.type;
  }

  public override async onClose(): Promise<void> {
    await this.destroy();
    return super.onClose();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public override async onOpen(): Promise<void> {
    this._view = mount(VaultChangelogComponent, {
      props: {
        plugin: this.plugin
      },
      target: this.contentEl
    }) as VaultChangelogComponent;
  }

  public override onunload(): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.destroy();
  }
}
