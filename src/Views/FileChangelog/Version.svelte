<script lang="ts">
  import type { FileChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
  import type { EventRef } from 'obsidian';

  import { OPEN_FILE_ICON } from 'constants.ts';
  import { mayTriggerChangelogMenu } from 'menu.ts';
  import { setIcon } from 'obsidian';
  import { onDestroy } from 'svelte';
  import { DiffFileStatus } from 'types.ts';
  import { assertNotNull } from 'utils.ts';
  import DiffStatsComponent from 'Views/components/DiffStats.svelte';
  import { FileChangelogView } from 'Views/FileChangelog/FileChangelog.ts';
  import { composeAriaLabel, composeVersionTitle } from 'Views/formatters.ts';
  import {
    canOpenInDiffView,
    changelogFileClick,
    openFile
  } from 'Views/helper.ts';

  interface Properties {
    entry: FileChangelogEntry;
    plugin: GitChangelogPlugin;
    previousEntry?: FileChangelogEntry;
    index: number;
  }
  const { entry, plugin, previousEntry, index }: Properties = $props();

  let openFileButton = $state<HTMLElement>();

  let dayChangedReference: EventRef;

  dayChangedReference = plugin.app.workspace.on(
    'git-changelog:day-changed',
    () => {
      formattedVersionDateLabel = updateFormattedVersionDateLabel();
    }
  );

  let formattedVersionDateLabel = $state(updateFormattedVersionDateLabel());

  function updateFormattedVersionDateLabel(): string {
    return composeVersionTitle({
      interval: plugin.settings.fileChangelogInterval,
      plugin,
      timeZoneAdjustedEntryDate: entry.timeZoneAdjustedDate
    });
  }

  onDestroy(() => {
    plugin.app.workspace.offref(dayChangedReference);
  });

  function primaryClick(event: MouseEvent): void {
    event.stopPropagation();

    if (isVersionClickable()) {
      changelogFileClick({
        // Plugin.emptyTreeHash is guaranteed to be initialized. Git plugin throws an error when you pass Plugin.emptyTreeHash but I haven't been able to work around it and it doesn't affect usability.

        aReference:
          previousEntry?.commitHash ?? assertNotNull(plugin.emptyTreeHash),
        bReference: entry.commitHash,
        event,
        file: entry,
        plugin
      });
    }
  }

  function openLiveVersion(event: MouseEvent): void {
    event.stopPropagation();

    if (!plugin.cachedActiveGitFile) {
      return;
    }
    const relativeVaultPath = plugin
      .getGitPlugin()
      // Pass plugin.cachedActiveGitFile instead of entry filePath so that in a case where the active file was renamed and that renamed not committed yet, this would still work and open that renamed live version.
      .gitManager.getRelativeVaultPath(plugin.cachedActiveGitFile);
    openFile({ event, plugin, relativeVaultPath });
  }

  $effect(() => {
    if (openFileButton) {
      setIcon(
        openFileButton,
        assertNotNull(openFileButton.getAttr('data-icon'))
      );
    }
  });
  function isVersionClickable(): boolean {
    return (
      // Can't open diffs of deleted versions
      entry.status !== DiffFileStatus.Deleted &&
      canOpenInDiffView({
        file: entry
      })
    );
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="git-changelog-align-file nav-file-title is-clickable git-changelog-file-changelog-entry"
  aria-label={composeAriaLabel(entry)}
  data-tooltip-position="bottom"
  onclick={primaryClick}
  onauxclick={(event) => {
    event.stopPropagation();
    // eslint-disable-next-line eqeqeq
    if (event.button == 2) {
      const view = plugin.app.workspace.getActiveViewOfType(FileChangelogView);
      if (view) {
        mayTriggerChangelogMenu({
          event,
          gitRelativePath: entry.pathGitRelative,
          commitHash: entry.commitHash,
          // Source: VAULT_CHANGELOG_VIEW_CONFIG.type,
          view: view.leaf,
          plugin
        });
      }
    }
  }}
>
  <div class="git-changelog-file-name-container">
    <div
      class="git-changelog-one-line {isVersionClickable()
        ? ''
        : 'git-changelog-faint'}"
    >
      {formattedVersionDateLabel}
    </div>
    {#if index === 0}
      <div
        data-icon={OPEN_FILE_ICON}
        aria-label="Open Live Version"
        bind:this={openFileButton}
        onauxclick={openLiveVersion}
        onclick={openLiveVersion}
        class="clickable-icon open-file-icon"
      ></div>
    {/if}
  </div>
  <DiffStatsComponent
    baseStats={entry.textDiffStats
      ? {
          additions: entry.textDiffStats.baseStats.additions,
          deletions: entry.textDiffStats.baseStats.deletions
        }
      : undefined}
    file={entry}
    inFileChangelog={true}
  />
</div>

<style lang="scss">
  .git-changelog-file-changelog-entry {
    padding-left: var(--size-4-2);
  }
</style>
