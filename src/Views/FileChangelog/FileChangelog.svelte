<script lang="ts">
  import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
  import type { EventRef } from 'obsidian';

  import { onDestroy, untrack } from 'svelte';
  import { LoaderState } from 'svelte-infinite';
  import ChangeIntervalButton from 'Views/components/ChangeIntervalButton.svelte';
  import DependenciesStatusCheck from 'Views/components/DependenciesStatusCheck.svelte';
  import InfiniteScroller from 'Views/VaultChangelog/InfiniteScroller.svelte';

  import Version from './Version.svelte';

  // eslint-disable-next-line capitalized-comments
  // svelte-ignore non_reactive_update
  enum FileChangelogState {
    EmptyHistory = 'emptyHistory',
    GitIgnoredFileOpen = 'gitIgnoredFileOpen',
    HasEntries = 'hasEntries',
    NoMarkdownFileOpen = 'noMarkdownFileOpen',
    Recomputing = 'recomputing'
  }

  interface Properties {
    plugin: GitChangelogPlugin;
  }
  const { plugin }: Properties = $props();
  let headChangeReference: EventRef;
  let settingsChangedReference: EventRef;
  let activeFileChangedReference: EventRef;

  const changelogManager = $derived(plugin.fileChangelogManager);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const loaderState = new LoaderState();

  const changelogState = $derived.by(() => {
    if (!plugin.dependenciesReady) {
      return FileChangelogState.Recomputing;
    }

    if (!changelogManager) {
      return FileChangelogState.Recomputing;
    }

    if (changelogManager.hasEntries) {
      return FileChangelogState.HasEntries;
    }

    // Since the check for hasEntries takes priority, UI won't flash each time the user scrolls (since that is a task in the queue) but only on recomputes.
    if (!changelogManager.taskManager.queueIsEmpty) {
      return FileChangelogState.Recomputing;
    }

    if (!plugin.cachedActiveGitFile) {
      return FileChangelogState.NoMarkdownFileOpen;
    }

    return FileChangelogState.EmptyHistory;
  });

  let fileChangelogSettingsChangedReference: EventRef;

  headChangeReference = plugin.app.workspace.on(
    'obsidian-git:head-change',
    () => {
      changelogManager?.tryUpdateEntries();
    }
  );
  fileChangelogSettingsChangedReference = plugin.app.workspace.on(
    'git-changelog:file-changelog-generation-settings-changed',
    () => {
      changelogManager?.resetSafely();
    }
  );

  settingsChangedReference = plugin.app.workspace.on(
    'git-changelog:generation-settings-changed',
    () => {
      changelogManager?.resetSafely();
    }
  );

  activeFileChangedReference = plugin.app.workspace.on(
    'git-changelog:active-git-file-changed',
    () => {
      changelogManager?.resetSafely();
    }
  );

  $effect(() => {
    if (changelogManager) {
      untrack(() => {
        changelogManager?.resetSafely();
      });
    }
  });

  onDestroy(() => {
    plugin.app.workspace.offref(activeFileChangedReference);

    plugin.app.workspace.offref(headChangeReference);
    plugin.app.workspace.offref(settingsChangedReference);
    plugin.app.workspace.offref(fileChangelogSettingsChangedReference);
  });
</script>

<div class="git-changelog-view">
  <!-- {#if true} -->
  <div class="nav-header">
    <div class="nav-buttons-container">
      <ChangeIntervalButton
        {changelogManager}
        enabled={changelogState === FileChangelogState.HasEntries}
        {plugin}
      ></ChangeIntervalButton>
    </div>
  </div>
  <!-- {:else}
    <div class="padding-top"></div>
  {/if} -->
  <DependenciesStatusCheck {plugin}>
    <div class="nav-files-container">
      {#if changelogState === FileChangelogState.HasEntries}
        <!-- eslint-disable-next-line @typescript-eslint/no-non-null-assertion -->
        <InfiniteScroller
          {loaderState}
          triggerLoad={// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          changelogManager!.handleScroll}
        >
          <!-- eslint-disable-next-line @typescript-eslint/no-non-null-assertion -->
          {#each changelogManager!.visibleEntries! as entry, index}
            <Version
              previousEntry={// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              changelogManager!.visibleEntries!.at(index + 1)}
              {entry}
              {plugin}
              {index}
            ></Version>
          {/each}
        </InfiniteScroller>
      {:else if changelogState === FileChangelogState.Recomputing}
        <div class="pane-empty">Loading...</div>
      {:else if changelogState === FileChangelogState.NoMarkdownFileOpen}
        <div class="pane-empty">No markdown file opened.</div>
      {:else}
        <div class="pane-empty">File has no Git history.</div>
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
</style>
