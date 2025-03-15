<script lang="ts">
  import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
  import type { EventRef } from 'obsidian';

  import { setIcon } from 'obsidian';
  import { onDestroy, untrack } from 'svelte';
  import ChangeIntervalButton from 'Views/components/ChangeIntervalButton.svelte';
  import DependenciesStatusCheck from 'Views/components/DependenciesStatusCheck.svelte';
  import DiffStatsComponent from 'Views/components/DiffStats.svelte';
  import { composeAriaLabel, composeVersionTitle } from 'Views/formatters.ts';
  import { canOpenInDiffView, changelogFileClick } from 'Views/helper.ts';

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
  let observer: IntersectionObserver | undefined;
  let headChangeReference: EventRef;
  let settingsChangedReference: EventRef;
  let sentinel: HTMLElement | undefined = $state();
  let activeFileChangedReference: EventRef;

  const changelogManager = $derived(plugin.fileChangelogManager);
  const openFileButton = $state<HTMLElement>();

  const changelogState = $derived.by(() => {
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
    'obsidian-git-changelog:file-changelog-generation-settings-changed',
    () => {
      changelogManager?.resetSafely();
    }
  );

  settingsChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:generation-settings-changed',
    () => {
      changelogManager?.resetSafely();
    }
  );

  activeFileChangedReference = plugin.app.workspace.on(
    'obsidian-git-changelog:active-file-changed',
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
    // Clean up existing observer first
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }

    if (changelogManager?.visibleEntries !== undefined && sentinel) {
      observer = new IntersectionObserver(
        (observerEntries) => {
          if (observerEntries[0].isIntersecting) {
            const abortSignal = changelogManager.taskManager.getAbortSignal();
            changelogManager.taskManager.enqueueSafely(() =>
              changelogManager.handleScroll({ abortSignal })
            );
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
    plugin.app.workspace.offref(activeFileChangedReference);

    plugin.app.workspace.offref(headChangeReference);
    plugin.app.workspace.offref(settingsChangedReference);
    plugin.app.workspace.offref(fileChangelogSettingsChangedReference);
  });

  $effect(() => {
    if (openFileButton) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      setIcon(openFileButton, openFileButton.getAttr('data-icon')!);
    }
  });

  function cleanupObserver(): void {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  }

  function primaryClick(event: MouseEvent, entryIndex: number | string): void {
    event.stopPropagation();

    if (isVersionClickable(entryIndex)) {
      changelogFileClick({
        aReference:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          changelogManager!.visibleEntries![(entryIndex as number) + 1]
            ?.commitHash,

        bReference:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          changelogManager!.visibleEntries![entryIndex as number].commitHash,
        event,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        file: changelogManager!.visibleEntries![entryIndex as number],
        plugin
      });
    }
  }

  function isVersionClickable(entryIndex: number | string): boolean {
    if (
      changelogManager?.visibleEntries === undefined ||
      typeof entryIndex === 'string'
    ) {
      return false;
    }
    return canOpenInDiffView({
      aReference: changelogManager.visibleEntries[entryIndex + 1]?.commitHash,
      bReference: changelogManager.visibleEntries[entryIndex].commitHash,
      file: changelogManager.visibleEntries[entryIndex]
    });
  }
</script>

<div class="git-changelog-view">
  <!-- {#if true} -->
  <div class="nav-header">
    <div class="nav-buttons-container">
      <ChangeIntervalButton
        {changelogManager}
        enabled={changelogManager?.hasEntries === true &&
          plugin.dependenciesReady}
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
        {#each changelogManager!.visibleEntries! as entry, index}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="git-changelog-align-file nav-file-title is-clickable git-changelog-file-changelog-entry"
            aria-label={composeAriaLabel(entry)}
            data-tooltip-position="bottom"
            onclick={// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            (event) => {
              primaryClick(event, index);
            }}
          >
            <div class="git-changelog-file-name-container">
              <div
                class="git-changelog-one-line {isVersionClickable(index)
                  ? ''
                  : 'git-changelog-faint'}"
              >
                {composeVersionTitle({
                  interval: plugin.settings.fileChangelogInterval,
                  plugin,
                  timezoneAdjustedEntryDate: entry.timezoneAdjustedDate
                })}
              </div>
            </div>
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
            />
          </div>
        {/each}
        <div bind:this={sentinel} id="sentinel"></div>
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
  .git-changelog-file-changelog-entry {
    display: flex;
    align-items: center;
    width: 100%;
    padding-left: var(--size-4-2);
    justify-content: space-between; // Better space distribution
  }
</style>
