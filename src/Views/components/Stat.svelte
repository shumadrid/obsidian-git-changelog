<script lang="ts">
  import type { StatEntry } from 'types.ts';

  import { ADDITIONS_ICON } from 'constants.ts';
  import { setIcon } from 'obsidian';

  interface Properties {
    isFileStat: boolean;
    isInvisible: boolean;
    stat?: StatEntry;
  }

  const { isFileStat, isInvisible, stat }: Properties = $props();
  let iconElement: HTMLElement;

  $effect(() => {
    if (iconElement) {
      if (stat) {
        setIcon(iconElement, stat.icon);
      } else {
        setIcon(iconElement, ADDITIONS_ICON);
      }
    }
  });

  function getStatType(): string {
    return stat?.type ?? 'M';
  }

  function getStatCount(): number {
    return stat?.count ?? 0;
  }

  // eslint-disable-next-line capitalized-comments
  // const shrinkableClass =
  // eslint-disable-next-line capitalized-comments
  //   isFileStat && isInvisible ? 'git-changelog-shrinkable' : '';
</script>

<span
  class={`${
    isFileStat ? 'git-changelog-3stat-item-file' : 'git-changelog-2stat-item'
  } `}
>
  <span
    class="{isFileStat ? 'file-icon' : 'icon'} git-changelog-4stat-color"
    class:invisible={isInvisible}
    data-type={getStatType()}
    bind:this={iconElement}
  ></span>
  <span
    class="number git-changelog-4stat-color"
    class:invisible={isInvisible}
    data-type={getStatType()}
  >
    {getStatCount()}
  </span>
</span>

<style lang="scss">
  // Doesn't work currently. It should make the invisible stats that are used to maintain the table structure shrink when space gets tight. Additionally, the diff-file-stats in DiffStats.svelte still enforces a gap.
  .git-changelog-shrinkable {
    min-width: 0;
  }
</style>
