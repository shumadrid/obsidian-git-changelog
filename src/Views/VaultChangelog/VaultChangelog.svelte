<script lang="ts">
  // Import { SimpleGit } from "src/gitManager/simpleGit";
  import type GitChangelogPlugin from 'main.ts';
  import type { EventRef } from 'obsidian';

  import { TOGGLE_FILES_SUMMARY_OPTION_ICON } from 'constants.ts';
  import { setIcon } from 'obsidian';
  import { onDestroy, untrack } from 'svelte';
  import { LoaderState } from 'svelte-infinite';
  import { FilesSummariesDisplayMode } from 'types.ts';

  import ChangeIntervalButton from '../components/ChangeIntervalButton.svelte';
  import DependenciesStatusCheck from '../components/DependenciesStatusCheck.svelte';
  import InfiniteScroller from '../components/InfiniteScroller.svelte';
  import VersionComponent from './components/Version.svelte';

  // eslint-disable-next-line capitalized-comments
  // svelte-ignore non_reactive_update
  enum VaultChangelogState {
    EmptyHistory = 'emptyHistory',
    HasEntries = 'hasEntries',
    Recomputing = 'recomputing'
  }

  interface Properties {
    plugin: GitChangelogPlugin;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const loaderState = new LoaderState();

  const { plugin }: Properties = $props();
  let collapseButton: HTMLElement | undefined;
  let filesSummaryDisplayModeButton: HTMLElement | undefined;

  let headChangeReference: EventRef;
  let settingsChangedReference: EventRef;
  let vaultChangelogSettingsChangedReference: EventRef;

  const changelogManager = $derived(plugin.vaultChangelogManager);

  const changelogState = $derived.by(() => {
    // Not entirely accurate, but works for the use case.
    if (!plugin.dependenciesReady) {
      return VaultChangelogState.Recomputing;
    }

    if (!changelogManager) {
      return VaultChangelogState.Recomputing;
    }

    if (changelogManager.hasEntries) {
      return VaultChangelogState.HasEntries;
    }

    if (!changelogManager.taskManager.queueIsEmpty) {
      return VaultChangelogState.Recomputing;
    }

    return VaultChangelogState.EmptyHistory;
  });

  let showFilesCountSummariesMode = $state(
    plugin.settings.fileSummariesDisplayMode
  );

  const allEntriesCollapsed = $derived(
    changelogManager?.visibleEntries?.every(
      (entry) => entry.isCollapsed ?? true
    )
  );

  headChangeReference = plugin.app.workspace.on(
    'obsidian-git:head-change',
    () => {
      if (changelogManager) {
        changelogManager.tryUpdateEntries();
      }
    }
  );

  vaultChangelogSettingsChangedReference = plugin.app.workspace.on(
    'git-changelog:vault-changelog-generation-settings-changed',
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

  $effect(() => {
    if (changelogManager) {
      untrack(() => {
        changelogManager?.resetSafely();
      });
    }
  });

  $effect(() => {
    if (collapseButton) {
      setIcon(
        collapseButton,
        allEntriesCollapsed ? 'chevrons-up-down' : 'chevrons-down-up'
      );
    }

    if (filesSummaryDisplayModeButton) {
      setIcon(filesSummaryDisplayModeButton, TOGGLE_FILES_SUMMARY_OPTION_ICON);
    }
  });

  onDestroy(() => {
    plugin.app.workspace.offref(headChangeReference);
    plugin.app.workspace.offref(settingsChangedReference);
    plugin.app.workspace.offref(vaultChangelogSettingsChangedReference);

    filesSummaryDisplayModeButton = undefined;
    collapseButton = undefined;
  });

  function toggleFilesSummaryOption(): void {
    showFilesCountSummariesMode =
      showFilesCountSummariesMode === FilesSummariesDisplayMode.Total
        ? FilesSummariesDisplayMode.TextAndBinary
        : FilesSummariesDisplayMode.Total;

    const newSettings = plugin.settingsClone;
    newSettings.fileSummariesDisplayMode = showFilesCountSummariesMode;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    plugin.saveSettings(newSettings);
  }

  function toggleCollapsedState(): void {
    // AllEntriesCollapsed needs to be cached because it is a reactive derived value that won't have a consistent state across the whole loop.
    const everythingCollapsed = allEntriesCollapsed;
    if (changelogManager?.visibleEntries)
      for (const entry of changelogManager.visibleEntries)
        entry.isCollapsed = !everythingCollapsed;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="git-changelog-view">
  <!-- {#if !compactMode} -->
  <div class="nav-header">
    <div class="nav-buttons-container">
      <div
        id="layoutChange"
        class="clickable-icon nav-action-button"
        data-icon={allEntriesCollapsed
          ? 'chevrons-up-down'
          : 'chevrons-down-up'}
        aria-disabled={changelogState !== VaultChangelogState.HasEntries}
        aria-label={allEntriesCollapsed ? 'Expand all' : 'Collapse all'}
        bind:this={collapseButton}
        onclick={changelogState === VaultChangelogState.HasEntries
          ? toggleCollapsedState
          : undefined}
      ></div>
      <ChangeIntervalButton
        enabled={changelogState === VaultChangelogState.HasEntries}
        {changelogManager}
        {plugin}
      ></ChangeIntervalButton>
      <div
        id="filesSummaryChange"
        class="clickable-icon nav-action-button"
        data-icon={TOGGLE_FILES_SUMMARY_OPTION_ICON}
        aria-disabled={changelogState !== VaultChangelogState.HasEntries}
        aria-label={showFilesCountSummariesMode ===
        FilesSummariesDisplayMode.Total
          ? 'Text/media summary stats'
          : 'Total files summary stats'}
        bind:this={filesSummaryDisplayModeButton}
        onclick={changelogState === VaultChangelogState.HasEntries
          ? toggleFilesSummaryOption
          : undefined}
      ></div>
    </div>
  </div>
  <!-- {/if} -->
  <DependenciesStatusCheck {plugin}>
    <div class="nav-files-container">
      {#if changelogState === VaultChangelogState.HasEntries}
        <InfiniteScroller
          {loaderState}
          triggerLoad={// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          changelogManager!.handleScroll}
        >
          <!-- eslint-disable-next-line @typescript-eslint/no-non-null-assertion -->
          {#each changelogManager!.visibleEntries! as version}
            <VersionComponent
              {version}
              {plugin}
              showFilesCountSummaries={showFilesCountSummariesMode}
            />
          {/each}
        </InfiniteScroller>
      {:else if changelogState === VaultChangelogState.Recomputing}
        <div class="pane-empty">Loading...</div>
      {:else if changelogState === VaultChangelogState.EmptyHistory}
        <div class="pane-empty">No commits detected.</div>
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
</style>
