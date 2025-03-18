<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { LoaderState } from 'svelte-infinite';

  import { InfiniteLoader } from 'svelte-infinite';

  interface Properties {
    children?: Snippet;
    triggerLoad: () => Promise<void>;
    loaderState: LoaderState;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { children, triggerLoad, loaderState }: Properties = $props();
</script>

<InfiniteLoader
  {loaderState}
  loading={empty}
  noData={empty}
  noResults={empty}
  intersectionOptions={{
    root: null,
    rootMargin: '0px 0px 0px 0px'
  }}
  coolingOff={empty}
  error={empty}
  loopDetectionTimeout={0}
  loopMaxCalls={// eslint-disable-next-line no-magic-numbers
  9_999_999_999}
  {triggerLoad}
>
  {@render children?.()}
</InfiniteLoader>

{#snippet empty()}{/snippet}

<style lang="scss">
</style>
