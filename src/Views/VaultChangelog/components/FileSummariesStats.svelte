<script lang="ts">
  import type { FilesSummary } from 'types.ts';

  import {
    FILE_ADDED_ICON,
    FILE_DELETED_ICON,
    FILE_MODIFIED_ICON,
    FILE_RENAMED_ICON
  } from 'constants.ts';
  import { setIcon } from 'obsidian';
  import { DiffFileStatus } from 'types.ts';

  interface Properties {
    filesSummary: FilesSummary;
  }

  interface SummaryStat {
    count: number;
    icon: string;
    type: DiffFileStatus;
  }

  const { filesSummary }: Properties = $props();

  const iconElements: Record<string, HTMLElement> = {};

  const stats: SummaryStat[] = [
    {
      count: filesSummary.addedFiles,
      icon: FILE_ADDED_ICON,
      type: DiffFileStatus.Added
    },

    {
      count: filesSummary.modifiedFiles,
      icon: FILE_MODIFIED_ICON,
      type: DiffFileStatus.Modified
    },
    {
      count: filesSummary.renamedAndMovedFiles,
      icon: FILE_RENAMED_ICON,
      type: DiffFileStatus.Renamed
    },
    {
      count: filesSummary.deletedFiles,
      icon: FILE_DELETED_ICON,
      type: DiffFileStatus.Deleted
    }
  ].filter((stat) => stat.count > 0);

  $effect(() => {
    for (const [type, element] of Object.entries(iconElements)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      const stat = stats.find((s) => s.type === type);
      if (stat) {
        setIcon(element, stat.icon);
      }
    }
  });

  function setStatIcon(node: HTMLElement, icon: string): void {
    setIcon(node, icon);
  }
</script>

{#each stats as stat (stat.type)}
  <span class="git-changelog-stat-item">
    <span
      class="icon git-changelog-stat-color"
      data-type={stat.type}
      use:setStatIcon={stat.icon}
    ></span>
    <span class="number git-changelog-stat-color" data-type={stat.type}>
      {stat.count}
    </span>
  </span>
{/each}

<style lang="scss">
  .git-changelog-stat-item {
    .number {
      font-weight: var(--font-medium);
    }
  }
</style>
