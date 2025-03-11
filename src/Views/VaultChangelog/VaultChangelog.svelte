<script lang="ts">
  import type GitChangelogPlugin from 'main.ts';
  import type { EventRef } from 'obsidian';
  // Import { SimpleGit } from "src/gitManager/simpleGit";

  import { TOGGLE_FILES_SUMMARY_OPTION_ICON } from 'constants.ts';
  import { appendChangelogEntries } from 'core/loadingEntries.ts';
  import { updateChangelogEntries } from 'core/updatingEntries.ts';
  import { setIcon } from 'obsidian';
  import { onDestroy, onMount } from 'svelte';
  import { FilesSummariesDisplayMode } from 'types.ts';
  import { appendEntries, initialCommitReached } from 'Views/helper.ts';

  import ChangeIntervalButton from '../components/ChangeIntervalButton.svelte';
  import DependenciesStatusCheck from '../components/DependenciesStatusCheck.svelte';
  import VersionComponent from './components/Version.svelte';

  interface Properties {
    plugin: GitChangelogPlugin;
  }

  const { plugin }: Properties = $props();
  let collapseButton: HTMLElement | undefined;
  let filesSummaryDisplayModeButton: HTMLElement | undefined;

  let observer: IntersectionObserver | undefined;

  let headChangeReference: EventRef;
  let settingsChangedReference: EventRef;
  let vaultChangelogSettingsChangedReference: EventRef;
  const entries = $derived(plugin.vaultChangelogEntries);
  let sentinel: HTMLElement | undefined = $state();

  // Let compactMode = $state(checkIfViewIsInStack());
  // Let isInSplit: EventRef;
  let showFilesCountSummaries = $state(
    plugin.settings.fileSummariesDisplayMode
  );
  const hasEntries = $derived(
    entries !== undefined && entries.length > 0 && plugin.dependenciesReady
  );

  const allEntriesCollapsed = $derived(
    entries?.every((entry) => entry.isCollapsed ?? true)
  );

  headChangeReference = plugin.app.workspace.on(
    'obsidian-git:head-change',
    () => {
      plugin
        .getGit()
        .then(() => {
          const abortSignal =
            plugin.changelogTaskManager.getAbortSignal('vault');
          plugin.changelogTaskManager.enqueueSafely(
            () => tryUpdateEntries(abortSignal),
            'vault'
          );
        })
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    }
  );
  vaultChangelogSettingsChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:vault-changelog-generation-settings-changed',
    () => {
      resetVaultChangelogSafely();
    }
  );

  settingsChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:generation-settings-changed',
    () => {
      resetVaultChangelogSafely();
    }
  );

  // IsInSplit = plugin.app.workspace.on('layout-change', () => {
  //   CompactMode = checkIfViewIsInStack();
  // });

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const initialLoading = async () => {
    if (plugin.changelogTaskManager) {
      resetVaultChangelogSafely();
    } else {
      // eslint-disable-next-line no-promise-executor-return, no-magic-numbers
      await new Promise((resolve) => setTimeout(resolve, 200));
      await initialLoading();
    }
  };

  onMount(async () => {
    // We have to wait for some time to pass so that the changelog task manager gets initialized in the plugin's onLayoutReady method.
    await initialLoading();
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
    cleanupObserver();
    plugin.app.workspace.offref(headChangeReference);
    plugin.app.workspace.offref(settingsChangedReference);
    // Plugin.app.workspace.offref(isInSplit);
    plugin.app.workspace.offref(vaultChangelogSettingsChangedReference);
    // Plugin.app.workspace.offref(layoutReadyReference);

    filesSummaryDisplayModeButton = undefined;
    collapseButton = undefined;
  });

  function resetVaultChangelogSafely(): void {
    // We want to immediately cancel all current operations for the vault changelog and schedule the rest of the operation in a queue.
    const abortSignal =
      plugin.changelogTaskManager.abortPreviousTasksAndGetSignal('vault');

    plugin.changelogTaskManager.enqueueSafely(async () => {
      await recomputeChangelog(abortSignal);
    }, 'vault');
  }

  function cleanupObserver(): void {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  }

  function initializeObserver(): void {
    cleanupObserver();

    if (entries !== undefined && sentinel) {
      observer = new IntersectionObserver(
        (observerEntries) => {
          if (observerEntries[0].isIntersecting) {
            const abortSignal =
              plugin.changelogTaskManager.getAbortSignal('vault');
            handleScroll(abortSignal);
          }
        },
        {
          root: document.querySelector('.nav-files-container'),
          rootMargin: '120px',
          // eslint-disable-next-line no-magic-numbers
          threshold: 0.1
        }
      );

      observer.observe(sentinel);
    }
  }

  // React to both entries and sentinel changes
  $effect(() => {
    if (entries !== undefined && sentinel) {
      initializeObserver();
    }
  });

  async function tryUpdateEntries(abortSignal: AbortSignal): Promise<void> {
    if (plugin.vaultChangelogEntries === undefined) {
      plugin.consoleDebug(
        "If git plugin wasn't just re-enabled, then a redundant vault changelog recomputation occurred!"
      );

      await recomputeChangelog(abortSignal);
    } else {
      await updateChangelogEntries({
        abortSignal,
        fileOrVault: 'vault',
        plugin
      });
    }
  }

  async function recomputeChangelog(abortSignal: AbortSignal): Promise<void> {
    await appendChangelogEntries({
      abortSignal,
      fileOrVault: 'vault',
      filePath: undefined,
      plugin,
      resetCache: true,
      upperBoundaryCommit: undefined
    });
  }

  function handleScroll(abortSignal: AbortSignal): void {
    plugin.changelogTaskManager.enqueueSafely(
      () => loadMore(abortSignal),
      'vault'
    );
  }

  async function loadMore(abortSignal: AbortSignal): Promise<void> {
    if (!initialCommitReached({ entries })) {
      await appendEntries({
        abortSignal,
        entries,
        fileOrVault: 'vault',
        plugin
      });
    }
  }

  function toggleFilesSummaryOption(): void {
    showFilesCountSummaries =
      showFilesCountSummaries === FilesSummariesDisplayMode.Total
        ? FilesSummariesDisplayMode.TextAndBinary
        : FilesSummariesDisplayMode.Total;

    const newSettings = plugin.settingsClone;
    newSettings.fileSummariesDisplayMode = showFilesCountSummaries;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    plugin.saveSettings(newSettings);
  }

  function toggleCollapsedState(): void {
    // AllEntriesCollapsed needs to be cached because it is a reactive derived value that won't have a consistent state across the whole loop.
    const everythingCollapsed = allEntriesCollapsed;
    if (entries)
      for (const entry of entries) entry.isCollapsed = !everythingCollapsed;
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
        aria-disabled={!hasEntries}
        aria-label={allEntriesCollapsed ? 'Expand All' : 'Collapse All'}
        bind:this={collapseButton}
        onclick={toggleCollapsedState}
      ></div>
      <ChangeIntervalButton
        enabled={hasEntries}
        resetChangelog={recomputeChangelog}
        {plugin}
        fileOrVault="vault"
      ></ChangeIntervalButton>
      <div
        id="filesSummaryChange"
        class="clickable-icon nav-action-button"
        data-icon={TOGGLE_FILES_SUMMARY_OPTION_ICON}
        aria-disabled={!hasEntries}
        aria-label={showFilesCountSummaries === FilesSummariesDisplayMode.Total
          ? 'Text/media summary stats'
          : 'Total files summary stats'}
        bind:this={filesSummaryDisplayModeButton}
        onclick={toggleFilesSummaryOption}
      ></div>
    </div>
  </div>
  <!-- {/if} -->
  <DependenciesStatusCheck {plugin}>
    <div class="nav-files-container">
      {#if entries && entries.length > 0}
        {#each entries as version}
          <div class="tree-item nav-folder mod-root">
            <VersionComponent {version} {plugin} {showFilesCountSummaries} />
          </div>
        {/each}
        <div bind:this={sentinel} id="sentinel"></div>
      {:else if plugin.changelogTaskManager.isVaultQueueEmpty}
        <div class="pane-empty">No commits detected.</div>
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
</style>
