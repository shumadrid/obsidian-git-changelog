<script lang="ts">
  import type { ChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type { ChangelogManager } from 'core/ChangelogManager.svelte.ts';
  import type GitChangelogPlugin from 'main.ts';

  import { CHANGE_INTERVAL_ICON } from 'constants.ts';
  import { setIcon } from 'obsidian';
  import { onDestroy } from 'svelte';

  interface Properties {
    changelogManager: ChangelogManager<ChangelogEntry> | undefined;
    enabled: boolean;
    plugin: GitChangelogPlugin;
  }

  const { changelogManager, enabled, plugin }: Properties = $props();

  let isChangingInterval = $state(false);
  let button: HTMLElement | undefined;

  $effect(() => {
    if (button) {
      setIcon(button, CHANGE_INTERVAL_ICON);
    }
  });

  onDestroy(() => {
    button = undefined;
  });

  async function onClick(): Promise<void> {
    if (!changelogManager) return;
    const abortSignal = changelogManager.resetAndGetSignal();
    await changelogManager.taskManager.enqueueAndWait(async () => {
      if (isChangingInterval) return;
      isChangingInterval = true;
      try {
        await changelogManager.setNextInterval();
        await changelogManager.computeChangelog(abortSignal);
      } catch (error) {
        if (error instanceof Error) {
          plugin.consoleDebug(error.message);
        }
      } finally {
        // If onClick can’t run concurrently (e.g. always in a queue), then it's ok to modify isChangingInterval like this.
        // eslint-disable-next-line require-atomic-updates
        isChangingInterval = false;
      }
    });
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  id="changeInterval"
  class="clickable-icon nav-action-button"
  data-icon={CHANGE_INTERVAL_ICON}
  aria-label="Change interval"
  aria-disabled={isChangingInterval || !enabled}
  bind:this={button}
  onclick={isChangingInterval || !enabled ? undefined : onClick}
></div>

<style lang="scss">
</style>
