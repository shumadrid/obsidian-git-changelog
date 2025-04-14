import type GitChangelogPlugin from 'main.ts';
import type { WorkspaceLeaf } from 'obsidian';
import type { CompareRepoCommitsViewState } from 'types.ts';

import { COMPARE_REPO_COMMITS_VIEW_CONFIG } from 'constants.ts';
import { ItemView } from 'obsidian';
import { mount, unmount } from 'svelte';
import { removeCompareVersionsView } from 'utils.ts';
import CompareRepoCommitsComponent from 'Views/CompareRepoCommits/CompareRepoCommits.svelte';
import { registerCloseViewIfDeferred } from 'Views/helper.ts';

export class CompareRepoCommitsView
  extends ItemView
  implements CompareRepoCommitsViewState
{
  public plugin: GitChangelogPlugin;
  public utcOlderDate: string;
  public utcNewerDate: string;
  private _view: CompareRepoCommitsComponent | undefined = undefined;

  public constructor({
    leaf,
    plugin,
    utcOlderDate,
    utcNewerDate
  }: {
    leaf: WorkspaceLeaf;
    plugin: GitChangelogPlugin;
    utcOlderDate: string;
    utcNewerDate: string;
  }) {
    super(leaf);
    this.plugin = plugin;
    this.utcOlderDate = utcOlderDate;
    this.utcNewerDate = utcNewerDate;

    this.navigation = false;
  }

  public async destroy(): Promise<void> {
    if (this._view) {
      await unmount(this._view);
      this._view = undefined;
    }
  }

  public override getDisplayText(): string {
    return COMPARE_REPO_COMMITS_VIEW_CONFIG.name;
  }

  public override getIcon(): string {
    return COMPARE_REPO_COMMITS_VIEW_CONFIG.icon;
  }

  public override getViewType(): string {
    return COMPARE_REPO_COMMITS_VIEW_CONFIG.type;
  }

  public override async onClose(): Promise<void> {
    await this.destroy();
    return super.onClose();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public override async onOpen(): Promise<void> {
    this._view = mount(CompareRepoCommitsComponent, {
      props: {
        plugin: this.plugin,
        closeView: () => {
          // Await this.close();
          removeCompareVersionsView(this.plugin);
        },
        utcOlderDate: this.utcOlderDate,
        utcNewerDate: this.utcNewerDate
      },
      target: this.contentEl
    }) as CompareRepoCommitsComponent;

    registerCloseViewIfDeferred(this, this.plugin);
  }

  public override onunload(): void {
    super.onunload();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.destroy();
  }
}
