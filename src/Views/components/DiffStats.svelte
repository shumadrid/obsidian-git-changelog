<script lang="ts">
  import type { DiffFile, StatEntry, TextDiffBaseStats } from 'types.ts';

  import {
    ADDITIONS_ICON,
    DELETIONS_ICON,
    MINUS_ICON,
    PLUS_ICON
  } from 'constants.ts';
  import { DiffFileStatus } from 'types.ts';
  import { formatDiffFileType } from 'Views/formatters.ts';

  import StatComponent from './Stat.svelte';

  interface Properties {
    baseStats?: TextDiffBaseStats;
    file?: DiffFile;
    inFileChangelog: boolean;
    // InFileExplorer: boolean;
  }
  const { baseStats, file, inFileChangelog }: Properties = $props();

  const isFileStat = file !== undefined;

  const stats: StatEntry[] = [
    {
      count: baseStats?.additions ?? 0,
      icon: isFileStat ? PLUS_ICON : ADDITIONS_ICON,
      type: 'Additions'
    },
    {
      count: baseStats?.deletions ?? 0,
      icon: isFileStat ? MINUS_ICON : DELETIONS_ICON,
      type: 'Deletions'
    }
  ];

  const findIndex = stats.findIndex(
    (stat) => stat.count !== undefined && stat.count > 0
  );

  function getFirstAppearingStat(): number {
    if (file?.status === DiffFileStatus.Modified) {
      if (findIndex === -1) {
        return Infinity;
      }
      return findIndex;
    }
    return -1;
  }

  const firstAppearingStat = getFirstAppearingStat();

  const statVisibilities = stats.map(
    (stat) => stat.count !== undefined && stat.count > 0
  );
</script>

<div
  class={isFileStat ? 'git-changelog-stats-container' : 'git-changelog-stat'}
>
  {#if stats.every((stat) => stat.count === 0) && !isFileStat}
    <StatComponent {isFileStat} isInvisible={false} />
  {:else}
    <div class="diff-file-stats">
      <!-- File status indicators -->
      {#if isFileStat}
        {#if file.status === DiffFileStatus.RenamedAndMoved}
          <div class=" git-changelog-renamed-and-moved">
            <div
              class="git-changelog-stat-color git-changelog-file-status-letter"
              data-type={DiffFileStatus.Moved}
            >
              M
            </div>
            <div
              class="git-changelog-stat-color git-changelog-file-status-letter"
              data-type={DiffFileStatus.Renamed}
            >
              {DiffFileStatus.Renamed}
            </div>
          </div>
        {:else if file.status !== DiffFileStatus.Modified}
          <span
            class="git-changelog-stat-color git-changelog-file-status-letter"
            data-type={file.status}
          >
            {file.status === DiffFileStatus.Moved ? 'M' : file.status}
          </span>
        {/if}
      {/if}

      {#if baseStats === undefined && isFileStat && !inFileChangelog}
        <span class="nav-file-tag git-changelog-file-type-tag">
          {formatDiffFileType(file)}
        </span>
      {:else}
        {#each stats as stat, index (stat.type)}
          {#if statVisibilities[index] || firstAppearingStat < index}
            <StatComponent
              {stat}
              {isFileStat}
              isInvisible={!statVisibilities[index]}
            />
          {/if}
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .diff-file-stats {
    display: flex;
    align-items: center;
    gap: var(--size-4-3);
    padding-right: 0px;
    justify-content: flex-end;
    padding-left: auto; // Add this to push content to the right
  }

  .git-changelog-stats-container {
    display: flex;
    align-items: center;
    height: 100%;
    vertical-align: middle;
    gap: var(--size-4-3);
    justify-content: flex-end; // Change from end to flex-end
    min-width: fit-content; // Prevent shrinking when space is tight
  }

  .git-changelog-file-type-tag {
    padding-right: var(--size-2-1);
    padding-left: 0;
  }
</style>
