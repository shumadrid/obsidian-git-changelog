<script lang="ts">
  import type { FileChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';

  import DiffStatsComponent from 'Views/components/DiffStats.svelte';
  import { composeAriaLabel, composeVersionTitle } from 'Views/formatters.ts';
  import { canOpenInDiffView, changelogFileClick } from 'Views/helper.ts';

  interface Properties {
    entry: FileChangelogEntry;
    plugin: GitChangelogPlugin;
    previousEntry?: FileChangelogEntry;
  }
  const { entry, plugin, previousEntry }: Properties = $props();

  function primaryClick(event: MouseEvent): void {
    event.stopPropagation();

    if (isVersionClickable()) {
      changelogFileClick({
        aReference:
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          previousEntry!.commitHash,
        bReference: entry.commitHash,
        event,
        file: entry,
        plugin
      });
    }
  }

  function isVersionClickable(): boolean {
    return canOpenInDiffView({
      aReference: previousEntry?.commitHash,
      bReference: entry.commitHash,
      file: entry
    });
  }

  const formattedVersionDateLabel = $derived.by(() => {
    // CurrentDay just used to trigger updates
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const currentDay = plugin.currentDay;
    return composeVersionTitle({
      interval: plugin.settings.fileChangelogInterval,
      plugin,
      timezoneAdjustedEntryDate: entry.timezoneAdjustedDate
    });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="git-changelog-align-file nav-file-title is-clickable git-changelog-file-changelog-entry"
  aria-label={composeAriaLabel(entry)}
  data-tooltip-position="bottom"
  onclick={primaryClick}
>
  <div class="git-changelog-file-name-container">
    <div
      class="git-changelog-one-line {isVersionClickable()
        ? ''
        : 'git-changelog-faint'}"
    >
      {formattedVersionDateLabel}
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

<style lang="scss">
  .git-changelog-file-changelog-entry {
    padding-left: var(--size-4-2);
  }
</style>
