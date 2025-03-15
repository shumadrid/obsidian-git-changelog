<script lang="ts">
  import type { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type GitChangelogPlugin from 'main.ts';

  import { slide } from 'svelte/transition';
  import { DiffFileStatus, FilesSummariesDisplayMode } from 'types.ts';
  import { composeVersionTitle } from 'Views/formatters.ts';

  import DiffStatsComponent from '../../components/DiffStats.svelte';
  import FileComponent from './File.svelte';
  import DayFilesStatusComponent from './FileSummariesStats.svelte';

  interface Properties {
    plugin: GitChangelogPlugin;
    showFilesCountSummaries: FilesSummariesDisplayMode;
    version: VaultChangelogEntry;
  }

  const { plugin, showFilesCountSummaries, version }: Properties = $props();

  const formattedDate = composeVersionTitle({
    interval: plugin.settings.vaultChangelogInterval,
    plugin,
    timezoneAdjustedEntryDate: version.timezoneAdjustedDate
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if !version.isInitialCommit()}
  <div class:is-collapsed={version.isCollapsed}>
    <div
      class="tree-item-self is-clickable git-changelog-bottom-padding"
      data-tooltip-position="bottom"
      onclick={/* eslint-disable-next-line @typescript-eslint/explicit-function-return-type */
      () => {
        version.isCollapsed = !version.isCollapsed;
      }}
    >
      {#if !version.isInitialCommit()}
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
        <div class="git-changelog-entry-title">{formattedDate}</div>
        <!-- if more than one option is selected then show labels -->
        {#if showFilesCountSummaries === FilesSummariesDisplayMode.Total}
          <div class="git-changelog-stat">
            <DayFilesStatusComponent
              filesSummary={version.getChangelogFilesSummary()}
            />
          </div>
        {/if}

        {#if showFilesCountSummaries === FilesSummariesDisplayMode.TextAndBinary}
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
    {#if !version.isCollapsed}
      <div
        class="tree-item-children"
        transition:slide|local={// eslint-disable-next-line no-magic-numbers
        { duration: 150 }}
      >
        {#each version.textFiles as file}
          {#if file !== undefined && file !== undefined}
            <FileComponent
              {file}
              currentDayCommitHash={version.commitHash}
              previousDayLastCommitHash={version.previousDayLastCommitHash}
              {plugin}
            />
          {/if}
        {/each}

        {#each version.binaryFiles as file}
          {#if file !== undefined && file !== undefined}
            <FileComponent
              {file}
              currentDayCommitHash={version.commitHash}
              previousDayLastCommitHash={version.previousDayLastCommitHash}
              {plugin}
            />
          {/if}
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <div class="git-changelog-margin-top">
    <span
      class="git-changelog-stat-color nav-file-tag git-changelog-tag"
      data-type={DiffFileStatus.Modified}
    >
      Initial version
    </span>
  </div>
{/if}

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

  .git-changelog-margin-top {
    margin-top: var(--size-4-2);
    padding-left: var(--size-4-3);
  }

  .git-changelog-summary-type-tag {
    margin-left: 0px;
    padding: 0px var(--size-4-1);
    font-weight: var(--font-normal);
  }

  .git-changelog-bottom-padding {
    padding-bottom: 2px;
  }
</style>
