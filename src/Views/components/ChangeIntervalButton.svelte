<script lang="ts">
  import type { ChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type { ChangelogManager } from 'core/ChangelogManager.svelte.ts';

  import { CHANGE_INTERVAL_ICON } from 'constants.ts';
  import { setIcon } from 'obsidian';
  import { onDestroy } from 'svelte';

  interface Properties {
    changelogManager: ChangelogManager<ChangelogEntry> | undefined;
    enabled: boolean;
  }

  const { changelogManager, enabled }: Properties = $props();

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
    try {
      // This triggers the settings changed event and resetSafely() is called. This comes before resetting the entries  because otherwise there would be a very brief flash that could be noticeable between the setting the loading state and changing the interval resulting in the interval string getting updated in the UI.
      await changelogManager?.setNextInterval();
    } catch {
      /* Empty */
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  id="changeInterval"
  class="clickable-icon nav-action-button"
  data-icon={CHANGE_INTERVAL_ICON}
  aria-label="Change interval"
  aria-disabled={!enabled}
  bind:this={button}
  onclick={enabled ? onClick : undefined}
></div>

<style lang="scss">
</style>
