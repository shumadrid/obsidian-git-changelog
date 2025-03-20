<script lang="ts">
  import type GitChangelogPlugin from 'main.ts';
  import type { DiffFile } from 'types.ts';

  import { OPEN_FILE_ICON } from 'constants.ts';
  import { isFileRenamedOrMoved } from 'core/gitOperations/helper.ts';
  import { setIcon } from 'obsidian';
  import { mayTriggerFileMenu } from 'utils.ts';
  import {
    canOpenInDiffView,
    changelogFileClick,
    fileOpenableInObsidian,
    getDisplayPath,
    openFile
  } from 'Views/helper.ts';
  import { VaultChangelogView } from 'Views/VaultChangelog/VaultChangelog.ts';

  import DiffStatsComponent from '../../components/DiffStats.svelte';

  interface Properties {
    currentVersionCommitHash: string;
    file: DiffFile;
    plugin: GitChangelogPlugin;
    previousVersionCommitHash?: string;
  }

  const {
    currentVersionCommitHash,
    file,
    plugin,
    previousVersionCommitHash
  }: Properties = $props();
  const buttons: HTMLElement[] = $state([]);

  const ariaLabel = isFileRenamedOrMoved(file.status)
    ? `${file.fromPathGitRelative}  →\n${file.pathGitRelative}`
    : file.pathGitRelative;

  $effect(() => {
    for (const b of buttons) {
      if (b) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        setIcon(b, b.getAttr('data-icon')!);
      }
    }
  });

  const isClickable = canOpenInDiffView({
    file
  });

  function primaryClick(event: MouseEvent): void {
    event.stopPropagation();

    if (!isClickable) return;
    changelogFileClick({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      aReference: previousVersionCommitHash ?? plugin.emptyTreeHash!,
      bReference: currentVersionCommitHash,
      event,
      file,
      plugin
    });
  }

  function getRelativeVaultPath(): string {
    return plugin
      .getGitPlugin()
      .gitManager.getRelativeVaultPath(file.pathGitRelative);
  }

  const fileOpenable = fileOpenableInObsidian(getRelativeVaultPath(), plugin);

  function openVaultFile(event: MouseEvent): void {
    event.stopPropagation();
    const relativeVaultPath = getRelativeVaultPath();
    openFile({ event, file, plugin, relativeVaultPath });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<div
  class="git-changelog-align-file nav-file-title
			'is-clickable'"
  data-tooltip-position="bottom"
  aria-label={ariaLabel}
  onclick={primaryClick}
  onauxclick={// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  (event) => {
    event.stopPropagation();
    // eslint-disable-next-line eqeqeq
    if (event.button == 2) {
      const view = plugin.app.workspace.getActiveViewOfType(VaultChangelogView);
      if (view) {
        mayTriggerFileMenu({
          app: plugin.app,
          event,
          filePath: getRelativeVaultPath(),
          source: 'git-source-control',
          view: view.leaf
        });
      }
    } else {
      primaryClick(event);
    }
  }}
  data-type={file.status}
>
  <div class="git-changelog-file-name-container">
    <div
      class="git-changelog-one-line {isClickable ? '' : 'git-changelog-faint'}"
    >
      {getDisplayPath(file.pathGitRelative)}
    </div>
    {#if fileOpenable}
      <div
        data-icon={OPEN_FILE_ICON}
        aria-label="Open File"
        bind:this={buttons[0]}
        onauxclick={openVaultFile}
        onclick={openVaultFile}
        class="clickable-icon open-file-icon"
      ></div>
    {/if}
  </div>

  <DiffStatsComponent
    inFileChangelog={false}
    baseStats={file.textDiffStats
      ? {
          additions: file.textDiffStats.baseStats.additions,
          deletions: file.textDiffStats.baseStats.deletions
        }
      : undefined}
    {file}
  />
</div>

<style lang="scss">
</style>
