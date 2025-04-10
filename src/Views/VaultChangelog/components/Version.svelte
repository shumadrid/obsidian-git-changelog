<script lang="ts">
  import type { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type GitChangelogPlugin from 'main.ts';

  import { mayTriggerChangelogMenu } from 'menu.ts';
  import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
  import { slide } from 'svelte/transition';
  import { FileSummariesDisplayMode } from 'types.ts';
  import { composeVersionTitle } from 'Views/formatters.ts';
  import { VaultChangelogView } from 'Views/VaultChangelog/VaultChangelog.ts';

  import DiffStatsComponent from '../../components/DiffStats.svelte';
  import FileComponent from './File.svelte';
  import DayFilesStatusComponent from './FileSummariesStats.svelte';

  interface Properties {
    plugin: GitChangelogPlugin;
    showFilesCountSummaries: FileSummariesDisplayMode;
    version: VaultChangelogEntry;
    hideTitleAndMakeUncollapsible?: boolean;
  }

  const {
    plugin,
    showFilesCountSummaries,
    version,
    hideTitleAndMakeUncollapsible: hideTitleAndCollapseIcon
  }: Properties = $props();

  const formattedVersionDateLabel = $derived.by(() => {
    // Doing it this way to ensure they're properly reacted to if changed.
    const currentDate = plugin.utcCurrentDateHour;
    const locale = plugin.localeSafe;
    return composeVersionTitle({
      interval: plugin.settings.vaultChangelogInterval,
      dayStartHour: plugin.settings.dayStartHour,
      locale,
      timeZone: getTimeZone(plugin),
      utcCurrentDateHour: currentDate,
      timeZoneAdjustedEntryDate: version.timeZoneAdjustedDate
    });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class:is-collapsed={hideTitleAndCollapseIcon ? false : version.isCollapsed}
  class="git-changelog-bottom-padding"
>
  <div
    class={`tree-item-self${hideTitleAndCollapseIcon ? '' : ' is-clickable'}`}
    data-tooltip-position="bottom"
    onclick={hideTitleAndCollapseIcon
      ? undefined
      : () => {
          version.isCollapsed = !version.isCollapsed;
        }}
    onauxclick={(event) => {
      event.stopPropagation();
      // eslint-disable-next-line eqeqeq
      if (event.button == 2) {
        const view =
          plugin.app.workspace.getActiveViewOfType(VaultChangelogView);
        if (view) {
          mayTriggerChangelogMenu({
            event,
            commitHash: version.commitHash,
            view: view.leaf,
            plugin
          });
        }
      }
    }}
  >
    {#if !hideTitleAndCollapseIcon}
      <div
        class="tree-item-icon nav-folder-collapse-indicator collapse-icon"
        class:is-collapsed={version.isCollapsed}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="svg-icon right-triangle"><path d="M3 8L12 17L21 8" /></svg
        >
      </div>
    {/if}
    <div class="file-stats git-changelog-files-summaries-stats">
      {#if !hideTitleAndCollapseIcon}
        <div class="git-changelog-entry-title">
          <div>{formattedVersionDateLabel}</div>
          {#if !version.previousVersionCommitHash}
            <div>
              <span class="nav-file-tag git-changelog-initial-version-tag"
                >Initial</span
              >
            </div>
          {/if}
        </div>
      {/if}
      <!-- if more than one option is selected then show labels -->
      {#if showFilesCountSummaries === FileSummariesDisplayMode.Total}
        <div class="git-changelog-stat">
          <DayFilesStatusComponent
            filesSummary={version.getChangelogFilesSummary()}
          />
        </div>
      {/if}

      {#if showFilesCountSummaries === FileSummariesDisplayMode.TextAndBinary}
        {#if version.binaryFiles.length > 0}
          <div class="git-changelog-stat">
            <DayFilesStatusComponent
              filesSummary={version.binaryFilesSummaryCached}
            />
            <span
              class="nav-file-tag git-changelog-tag git-changelog-summary-type-tag"
              >MEDIA</span
            >
          </div>
        {/if}
        {#if version.textFiles.length > 0}
          <div class="git-changelog-stat">
            <DayFilesStatusComponent
              filesSummary={version.textFilesSummaryCached}
            />
            <span
              class="nav-file-tag git-changelog-tag git-changelog-summary-type-tag"
              >TEXT</span
            >
          </div>
        {/if}
      {/if}

      <DiffStatsComponent
        inFileChangelog={false}
        baseStats={{
          additions: version.getChangelogContentAdditions(),
          deletions: version.getChangelogContentDeletions()
        }}
      />
    </div>
  </div>
  {#if hideTitleAndCollapseIcon ? true : !version.isCollapsed}
    <div class="tree-item-children" transition:slide|local={{ duration: 150 }}>
      {#each version.textFiles as file (file.pathGitRelative)}
        {#if file !== undefined && file !== undefined}
          <FileComponent
            {file}
            currentVersionCommitHash={version.commitHash}
            previousVersionCommitHash={version.previousVersionCommitHash}
            {plugin}
          />
        {/if}
      {/each}

      {#each version.binaryFiles as file (file.pathGitRelative)}
        {#if file !== undefined && file !== undefined}
          <FileComponent
            {file}
            currentVersionCommitHash={version.commitHash}
            previousVersionCommitHash={version.previousVersionCommitHash}
            {plugin}
          />
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .git-changelog-files-summaries-stats {
    display: flex;
    align-items: start;
    flex-direction: column;
  }

  .git-changelog-tag {
    font-size: 0.72em;
    padding: var(--size-4-1) var(--size-4-2);
  }

  .git-changelog-summary-type-tag {
    margin-left: 0px;
    padding: 0px var(--size-4-1);
    font-weight: var(--font-normal);
  }

  .git-changelog-bottom-padding {
    padding-bottom: var(--size-2-1);
  }
</style>
