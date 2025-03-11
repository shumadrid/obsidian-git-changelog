<script lang="ts">
  import type {
    DiffFile,
    StatEntry,
    TextDiffBaseStats,
    TextDiffMoveStats
  } from 'types.ts';

  import {
    ADDITIONS_ICON,
    DELETIONS_ICON,
    MINUS_ICON,
    PLUS_ICON
  } from 'constants.ts';
  import { formatDiffFileType } from 'Views/formatters.ts';

  import StatComponent from './Stat.svelte';

  interface Properties {
    baseStats?: TextDiffBaseStats;
    file?: DiffFile;
    inFileChangelog: boolean;
    inFileExplorer?: boolean;
    moveStats?: TextDiffMoveStats;
  }
  const { baseStats, file, inFileChangelog }: Properties = $props();

  const isFileStat = $derived(file !== undefined);

  const stats = $derived<StatEntry[]>([
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
  ]);

  // BUG: not reactive?
  const findIndex = $derived(
    stats.findIndex((stat) => stat.count !== undefined && stat.count > 0)
  );

  const firstAppearingStat = $derived(findIndex === -1 ? Infinity : findIndex);

  // BUG: not reactive
  const statVisibilities = $derived(
    stats.map((stat) => stat.count !== undefined && stat.count > 0)
  );
</script>

<div
  class=" {isFileStat ? 'git-changelog-stats-container' : 'git-changelog-stat'}"
>
  {#if baseStats === undefined && isFileStat}
    {#if !inFileChangelog}
      <span class="nav-file-tag git-changelog-file-type-tag">
        {formatDiffFileType(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          file!
        )}
      </span>
    {/if}
  {:else if !stats.some((stat) => stat.count > 0) && !isFileStat}
    <StatComponent {isFileStat} isInvisible={false} />
  {:else}
    {#each stats as stat, index}
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

<style lang="scss">
  .git-changelog-stats-container {
    display: flex;
    align-items: center;
    height: 100%;
    vertical-align: middle;
    gap: var(--size-4-3);
    justify-content: flex-end;
  }

  .git-changelog-file-type-tag {
    margin-right: var(--size-2-1);
    margin-left: 0;
  }
</style>
