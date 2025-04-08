<script lang="ts">
  // Import { SimpleGit } from "src/gitManager/simpleGit";
  import type GitChangelogPlugin from 'main.ts';
  import type { EventRef } from 'obsidian';
  import type { GitChangelogSettings } from 'settings/settings.ts';

  import { TOGGLE_FILES_SUMMARY_OPTION_ICON } from 'constants.ts';
  import { setIcon } from 'obsidian';
  import { onDestroy, untrack } from 'svelte';
  import { LoaderState } from 'svelte-infinite';
  import { FilesSummariesDisplayMode } from 'types.ts';
  import { assertNotNull } from 'utils.ts';
  import { getIntervalAdjectiveString } from 'Views/formatters.ts';

  import ChangeIntervalButton from '../components/ChangeIntervalButton.svelte';
  import DependenciesStatusCheck from '../components/DependenciesStatusCheck.svelte';
  import InfiniteScroller from '../components/InfiniteScroller.svelte';
  import VersionComponent from './components/Version.svelte';

  // eslint-disable-next-line capitalized-comments
  // svelte-ignore non_reactive_update
  enum VaultChangelogState {
    EmptyHistory = 'emptyHistory',
    HasEntries = 'hasEntries',
    Recomputing = 'recomputing',
    Initializing = 'initializing'
  }

  interface Properties {
    plugin: GitChangelogPlugin;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
  const loaderState = new LoaderState();
  let intervalAdjective = $state<string>();

  const { plugin }: Properties = $props();
  let collapseButton: HTMLElement | undefined;
  let filesSummaryDisplayModeButton: HTMLElement | undefined;

  let headChangeReference: EventRef;
  let settingsChangedReference: EventRef;
  let vaultChangelogSettingsChangedReference: EventRef;

  const changelogManager = $derived(plugin.vaultChangelogManager);

  const changelogState = $derived.by(() => {
    // The only practical difference between the "initializing" and "recomputing" status is what string to display for loading state because if the changelog isn't initialized we can't show which exact interval is used for computing the versions.
    if (!changelogManager) {
      return VaultChangelogState.Initializing;
    }

    // Not entirely accurate, but works for the use case.
    if (!plugin.dependenciesReady) {
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
      setIntervalAdjective();
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

  $effect.pre(() => {
    setIntervalAdjective();
  });

  function setIntervalAdjective(): void {
    if (changelogManager) {
      intervalAdjective = getIntervalAdjectiveString(
        changelogManager.getInterval()
      );
    }
  }

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

  async function toggleFilesSummaryOption(): Promise<void> {
    showFilesCountSummariesMode =
      showFilesCountSummariesMode === FilesSummariesDisplayMode.Total
        ? FilesSummariesDisplayMode.TextAndBinary
        : FilesSummariesDisplayMode.Total;

    await plugin.settingsManager.editAndSave(
      (settings: GitChangelogSettings): void => {
        settings.fileSummariesDisplayMode = showFilesCountSummariesMode;
      }
    );
  }

  function toggleCollapsedState(): void {
    // AllEntriesCollapsed needs to be cached because it is a reactive derived value that won't have a consistent state across the whole loop.
    const everythingCollapsed = allEntriesCollapsed;
    if (changelogManager?.visibleEntries) {
      // Temporary workaround to stop freezing when trying to expand a large number of versions.
      if (
        // eslint-disable-next-line no-magic-numbers
        changelogManager?.visibleEntries?.length < 80 ||
        everythingCollapsed !== true
      ) {
        for (const entry of changelogManager.visibleEntries)
          entry.isCollapsed = !everythingCollapsed;
      } else {
        plugin.displayNotice(
          `Too many versions. Unable to expand them all because of the impact on performance.`,
          // eslint-disable-next-line no-magic-numbers
          1500
        );
      }
    }
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
        enabled={changelogState !== VaultChangelogState.Initializing &&
          plugin.dependenciesReady === true}
        {changelogManager}
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
          triggerLoad={assertNotNull(changelogManager).handleScroll}
        >
          {#each assertNotNull(assertNotNull(changelogManager).visibleEntries) as version (version.commitHash)}
            <VersionComponent
              {version}
              {plugin}
              showFilesCountSummaries={showFilesCountSummariesMode}
            />
          {/each}
        </InfiniteScroller>
      {:else if changelogState === VaultChangelogState.Recomputing}
        <div class="pane-empty">
          Loading {intervalAdjective} versions...
        </div>
      {:else if changelogState === VaultChangelogState.EmptyHistory}
        <div class="pane-empty">No commits detected.</div>
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
</style>
