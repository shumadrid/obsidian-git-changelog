<script lang="ts">
  import type GitChangelogPlugin from 'main.ts';
  import type { Snippet } from 'svelte';

  import { GitPluginState } from 'types.ts';

  interface Properties {
    children?: Snippet;
    plugin: GitChangelogPlugin;
  }

  const { children, plugin }: Properties = $props();
</script>

{#if plugin.gitPluginState === GitPluginState.Uninitialized}
  <div class="pane-empty git-changelog-git-issue">
    ⚠️ This plugin requires the Git plugin to be installed & enabled.
  </div>
{:else if plugin.gitPluginState === GitPluginState.IncompatibleVersion}
  <div class="pane-empty git-changelog-git-issue">
    ⚠️ Current version of the Git plugin is incompatible.
  </div>
{:else if plugin.gitRepoReady === false}
  <div class="pane-empty git-changelog-git-issue">
    ⚠️ Can't detect a valid active git repository. Please ensure you have
    configured a valid Git repository with the Git plugin.
  </div>
{:else}
  {@render children?.()}
{/if}

<style>
  .git-changelog-git-issue {
    color: var(--text-warning);
    padding: 0 var(--size-4-6);
    opacity: var(--git-changelog-opacity);
  }
</style>
