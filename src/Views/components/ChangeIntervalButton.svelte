<script lang="ts">
  import type GitChangelogPlugin from 'main.ts';

  import { CHANGE_INTERVAL_ICON } from 'constants.ts';
  import { setIcon } from 'obsidian';
  import { setNextChangelogInterval } from 'settings/validation/changelogInterval.ts';
  import { onDestroy } from 'svelte';

  interface Properties {
    enabled: boolean;
    fileOrVault: 'file' | 'vault';
    plugin: GitChangelogPlugin;
    resetChangelog: (abortSignal: AbortSignal) => Promise<void>;
  }

  const {
    enabled,
    fileOrVault,
    plugin,
    resetChangelog: recomputeChangelog
  }: Properties = $props();

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
    const abortSignal =
      plugin.changelogTaskManager.abortPreviousTasksAndGetSignal(fileOrVault);

    await plugin.changelogTaskManager.enqueueAndWait(
      async () => {
        if (isChangingInterval) return;
        isChangingInterval = true;
        try {
          await setNextChangelogInterval(plugin, fileOrVault);
          await recomputeChangelog(abortSignal);
        } catch (error) {
          if (error instanceof Error) {
            plugin.consoleDebug(error.message);
          }
        } finally {
          // If onClick can’t run concurrently (e.g. always in a queue), then it's ok to modify isChangingInterval like this.
          // eslint-disable-next-line require-atomic-updates
          isChangingInterval = false;
        }
      },

      fileOrVault
    );
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  id="changeInterval"
  class="clickable-icon nav-action-button"
  data-icon={CHANGE_INTERVAL_ICON}
  aria-label="Change Interval"
  aria-disabled={isChangingInterval || !enabled}
  bind:this={button}
  onclick={onClick}
></div>

<style lang="scss">
</style>
