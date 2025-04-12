import type GitChangelogPlugin from 'main.ts';
import type { WorkspaceLeaf } from 'obsidian';

import { COMPARE_TO_CHECKPOINT_VIEW_CONFIG } from 'constants.ts';
import { ItemView } from 'obsidian';
import { mount, unmount } from 'svelte';
import { removeCompareVersionsView } from 'utils.ts';
import CompareToCheckpointComponent from 'Views/CompareToCheckpoint/CompareToCheckpoint.svelte';
import { registerCloseViewIfDeferred } from 'Views/helper.ts';

/**
 * This was originally a modal, but user should also be able to click on the changes to inspect them, so it was migrated to a temporary view.
 */
export class CompareToCheckpointView extends ItemView {
  public plugin: GitChangelogPlugin;
  private _view: CompareToCheckpointComponent | undefined = undefined;

  public constructor(leaf: WorkspaceLeaf, plugin: GitChangelogPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.navigation = false;
    // This.closeable = true;
  }

  public async destroy(): Promise<void> {
    if (this._view) {
      await unmount(this._view);
      this._view = undefined;
    }
  }

  public override getDisplayText(): string {
    return COMPARE_TO_CHECKPOINT_VIEW_CONFIG.name;
  }

  public override getIcon(): string {
    return COMPARE_TO_CHECKPOINT_VIEW_CONFIG.icon;
  }

  public override getViewType(): string {
    return COMPARE_TO_CHECKPOINT_VIEW_CONFIG.type;
  }

  public override async onClose(): Promise<void> {
    await this.destroy();
    return super.onClose();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public override async onOpen(): Promise<void> {
    this._view = mount(CompareToCheckpointComponent, {
      props: {
        plugin: this.plugin,
        closeView: async () => {
          await this.close();
          removeCompareVersionsView(this.plugin);
        }
      },
      target: this.contentEl
    }) as CompareToCheckpointComponent;

    registerCloseViewIfDeferred(this, this.plugin);
  }

  public override onunload(): void {
    super.onunload();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.destroy();
  }
}
