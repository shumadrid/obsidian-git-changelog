<script lang="ts">
  import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
  import type { EventRef } from 'obsidian';

  import { runCheckIgnore } from 'core/gitOperations/runCheckIgnore.ts';
  import { appendChangelogEntries } from 'core/loadingEntries.ts';
  import { updateChangelogEntries } from 'core/updatingEntries.ts';
  import { onDestroy, onMount } from 'svelte';
  import { isMoved, isRenamed } from 'utils.ts';
  import ChangeIntervalButton from 'Views/components/ChangeIntervalButton.svelte';
  import DependenciesStatusCheck from 'Views/components/DependenciesStatusCheck.svelte';
  import DiffStatsComponent from 'Views/components/DiffStats.svelte';
  import { composeAriaLabel, composeVersionTitle } from 'Views/formatters.ts';
  import {
    appendEntries,
    changelogFileClick,
    getActiveGitRelativeFile,
    initialCommitReached
  } from 'Views/helper.ts';

  interface Properties {
    plugin: GitChangelogPlugin;
  }

  const { plugin }: Properties = $props();
  let observer: IntersectionObserver | undefined;
  let headChangeReference: EventRef;
  let settingsChangedReference: EventRef;
  let sentinel: HTMLElement | undefined = $state();
  const entries = $derived(plugin.fileChangelogEntries);
  const hasEntries = $derived(entries !== undefined && entries.length > 0);

  // Specific to file changelog
  let activeFileChangedReference: EventRef;
  let gitIgnoredFileOpen = $state(false);
  let fileChangelogSettingsChangedReference: EventRef;

  headChangeReference = plugin.app.workspace.on(
    'obsidian-git:head-change',
    () => {
      if (plugin.changelogTaskManager) {
        const abortSignal = plugin.changelogTaskManager.getAbortSignal('file');
        plugin.changelogTaskManager.enqueueSafely(
          () => tryUpdateEntries(abortSignal),
          'file'
        );
      }
    }
  );
  fileChangelogSettingsChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:file-changelog-generation-settings-changed',
    () => {
      resetFileChangelogSafely();
    }
  );

  settingsChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:generation-settings-changed',
    () => {
      resetFileChangelogSafely();
    }
  );

  activeFileChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:active-file-changed',
    () => {
      resetFileChangelogSafely();
    }
  );

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const initialLoading = async () => {
    //
    if (plugin.changelogTaskManager) {
      const abortSignal =
        plugin.changelogTaskManager.abortPreviousTasksAndGetSignal('file');

      plugin.changelogTaskManager.enqueueSafely(async () => {
        // Because active git file isn't cached at mount
        await recomputeChangelog(abortSignal, getActiveGitRelativeFile(plugin));
      }, 'file');
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
    // Clean up existing observer first
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }

    if (entries !== undefined && sentinel) {
      observer = new IntersectionObserver(
        (observerEntries) => {
          if (observerEntries[0].isIntersecting) {
            const abortSignal =
              plugin.changelogTaskManager.getAbortSignal('file');
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

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    return () => {
      if (observer) {
        observer.disconnect();
        observer = undefined;
      }
    };
  });

  onDestroy(() => {
    cleanupObserver();
    plugin.app.workspace.offref(headChangeReference);
    plugin.app.workspace.offref(settingsChangedReference);
    plugin.app.workspace.offref(fileChangelogSettingsChangedReference);
    plugin.app.workspace.offref(activeFileChangedReference);

    // Observer = undefined;
  });

  function cleanupObserver(): void {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  }

  function resetFileChangelogSafely(): void {
    const abortSignal =
      plugin.changelogTaskManager.abortPreviousTasksAndGetSignal('file');

    plugin.changelogTaskManager.enqueueSafely(async () => {
      await recomputeChangelog(abortSignal);
    }, 'file');
  }

  async function tryUpdateEntries(abortSignal: AbortSignal): Promise<void> {
    if (
      // AppendEntries handles the other case
      entries !== undefined
    ) {
      if (activeFilePotentiallyRenamed()) {
        plugin.consoleDebug('active file potentially renamed');
        plugin.updateActiveGitFile();
      } else {
        plugin.consoleDebug('active file not renamed, running update');
        await updateChangelogEntries({
          abortSignal,
          fileOrVault: 'file',
          filePath: plugin.cachedActiveGitFile,
          plugin
        });
      }
    }
  }

  /**
   * This should ideally never trigger on user interaction but always automatically
   */
  async function recomputeChangelog(
    abortSignal: AbortSignal,
    path: string | undefined = plugin.cachedActiveGitFile
  ): Promise<void> {
    if (path === undefined) {
      plugin.fileChangelogEntries = undefined;
    } else {
      await appendChangelogEntries({
        abortSignal,
        fileOrVault: 'file',
        filePath: path,
        plugin,
        resetCache: true,
        upperBoundaryCommit: undefined
      });
    }
    // If the file git log yielded no entries, check if it's because the file is ignored by git, or if it's just a new file with no history
    if (entries === undefined || entries.length === 0) {
      // Replace with live activeGitFile check
      gitIgnoredFileOpen =
        !!plugin.cachedActiveGitFile &&
        (await runCheckIgnore({
          activeGitFile: plugin.cachedActiveGitFile,
          plugin
        }));
    }
  }

  function handleScroll(abortSignal: AbortSignal): void {
    plugin.changelogTaskManager.enqueueSafely(
      () => loadMore(abortSignal),
      'file'
    );
  }
  async function loadMore(abortSignal: AbortSignal): Promise<void> {
    if (
      !initialCommitReached({
        entries
      }) &&
      plugin.cachedActiveGitFile !== undefined
    ) {
      await appendEntries({
        abortSignal,
        entries,
        fileOrVault: 'file',
        plugin
      });
    }
  }

  function primaryClick(event: MouseEvent, entryIndex: number | string): void {
    if (entries === undefined || typeof entryIndex === 'string') {
      return;
    }
    changelogFileClick(
      event,
      entries[entryIndex],
      plugin,
      entries[entryIndex + 1]?.commitHash,
      entries[entryIndex].commitHash
    );
  }

  function activeFilePotentiallyRenamed(): boolean {
    if (entries !== undefined && entries.length > 0) {
      return getActiveGitRelativeFile(plugin) !== entries[0].pathGitRelative;
    }

    return false;
  }
</script>

<div class="git-changelog-view">
  <!-- {#if true} -->
  <div class="nav-header">
    <div class="nav-buttons-container">
      <ChangeIntervalButton
        resetChangelog={recomputeChangelog}
        enabled={hasEntries}
        {plugin}
        fileOrVault="file"
      ></ChangeIntervalButton>
    </div>
  </div>
  <!-- {:else}
    <div class="padding-top"></div>
  {/if} -->
  <DependenciesStatusCheck {plugin}>
    <div class="nav-files-container">
      {#if entries !== undefined}
        {#each entries as entry, index}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="tree-item-self git-changelog-file-changelog-entry is-clickable nav-file-title"
            aria-label={composeAriaLabel(entry)}
            data-tooltip-position="bottom"
            onclick={// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            (event) => {
              primaryClick(event, index);
            }}
          >
            <div class="git-changelog-changelog-date">
              {composeVersionTitle({
                interval: plugin.settings.fileChangelogInterval,
                plugin,
                timezoneAdjustedEntryDate: entry.timezoneAdjustedDate
              })}
            </div>

            <div class="file-actions git-changelog-status-tag">
              {#if entry.fromPathGitRelative === undefined}
                <span
                  class="git-changelog-stat-color nav-file-tag"
                  data-type={entry.status}
                >
                  Created
                </span>
              {:else}
                {#if isMoved(entry)}
                  <span
                    class="git-changelog-stat-color nav-file-tag"
                    data-type="F"
                  >
                    Moved
                  </span>
                {/if}

                {#if isRenamed(entry)}
                  <span
                    class="git-changelog-stat-color nav-file-tag"
                    data-type="R"
                  >
                    Renamed
                  </span>
                {/if}
              {/if}
              {#if entry.textDiffStats?.baseStats !== undefined && entry.textDiffStats.baseStats.additions + entry.textDiffStats.baseStats.deletions > 0}
                <span class="git-changelog-margin-left">
                  <DiffStatsComponent
                    baseStats={entry.textDiffStats
                      ? {
                          additions: entry.textDiffStats.baseStats.additions,
                          deletions: entry.textDiffStats.baseStats.deletions
                        }
                      : undefined}
                    inFileExplorer={false}
                    file={entry}
                    inFileChangelog={true}
                  /></span
                >
              {/if}
            </div>
          </div>
          <!-- </div> -->
        {/each}
        <div bind:this={sentinel} id="sentinel"></div>
      {:else if plugin.changelogTaskManager.isFileQueueEmpty}
        {#if plugin.cachedActiveGitFile === undefined}
          <div class="pane-empty">No markdown file opened.</div>
        {:else if gitIgnoredFileOpen}
          <div class="pane-empty">File is ignored by Git.</div>
        {:else}
          <div class="pane-empty">File isn't a markdown file.</div>
        {/if}
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
  .git-changelog-file-changelog-entry {
    display: flex;
    align-items: center;
    width: 100%;
    padding-left: var(--size-4-2);
  }

  .git-changelog-margin-left {
    margin-left: var(--size-2-3);
  }

  .git-changelog-status-tag {
    display: flex;
    align-items: center;
    padding-right: 0px;
    overflow: hidden;
    flex-grow: 1;
    flex-shrink: 1;
    min-width: 0;
    width: 100%;
    justify-content: flex-end;
  }
</style>
