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
</script>

<span
  class={isFileStat
    ? 'git-changelog-stat-item-file'
    : 'git-changelog-stat-item'}
>
  <span
    class="{isFileStat ? 'file-icon' : 'icon'} git-changelog-stat-color"
    class:invisible={isInvisible}
    data-type={getStatType()}
    bind:this={iconElement}
  ></span>
  <span
    class="number git-changelog-stat-color"
    class:invisible={isInvisible}
    data-type={getStatType()}
  >
    {getStatCount()}
  </span>
</span>

<style lang="scss">
</style>
