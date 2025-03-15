<script lang="ts">
  import type GitChangelogPlugin from 'main.ts';
  import type { DiffFile } from 'types.ts';

  import { OPEN_FILE_ICON } from 'constants.ts';
  import { isFileRenamedOrMoved } from 'core/gitOperations/helper.ts';
  import { setIcon, TFile } from 'obsidian';
  import { mayTriggerFileMenu } from 'utils.ts';
  import {
    canOpenInDiffView,
    changelogFileClick,
    getDisplayPath,
    openFile
  } from 'Views/helper.ts';
  import { VaultChangelogView } from 'Views/VaultChangelog/VaultChangelog.ts';

  import DiffStatsComponent from '../../components/DiffStats.svelte';

  interface Properties {
    currentDayCommitHash: string;
    file: DiffFile;
    plugin: GitChangelogPlugin;

    previousDayLastCommitHash?: string;
  }

  const {
    currentDayCommitHash,
    file,
    plugin,
    previousDayLastCommitHash
  }: Properties = $props();
  const buttons: HTMLElement[] = $state([]);

  const ariaLabel = isFileRenamedOrMoved(file.status)
    ? `${file.fromPathGitRelative}  →\n${file.pathGitRelative}`
    : file.pathGitRelative;

  // This isn't perfect because some old file path could match an unrelated file's current path in the current state of the vault.
  const relativeVaultPath = plugin
    .getGitPlugin()
    .gitManager.getRelativeVaultPath(file.pathGitRelative);

  const tFile = plugin.app.vault.getAbstractFileByPath(relativeVaultPath);

  $effect(() => {
    for (const b of buttons) {
      if (b) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        setIcon(b, b.getAttr('data-icon')!);
      }
    }
  });

  const isClickable = canOpenInDiffView({
    aReference: previousDayLastCommitHash ?? currentDayCommitHash,
    bReference: currentDayCommitHash,
    file
  });

  function primaryClick(event: MouseEvent): void {
    event.stopPropagation();

    if (!isClickable) return;
    changelogFileClick({
      aReference: previousDayLastCommitHash ?? currentDayCommitHash,
      bReference: currentDayCommitHash,
      event,
      file,
      plugin
    });
  }

  function openVaultFile(event: MouseEvent): void {
    event.stopPropagation();
    openFile({ event, file, plugin, relativeVaultPath });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<div
  class="git-changelog-align-file nav-file-title
			'is-clickable'"
  data-path={relativeVaultPath}
  data-tooltip-position="bottom"
  aria-label={ariaLabel}
  onclick={primaryClick}
  onauxclick={// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  (event) => {
    event.stopPropagation();
    // eslint-disable-next-line no-magic-numbers, eqeqeq
    if (event.button == 2) {
      const view = plugin.app.workspace.getActiveViewOfType(VaultChangelogView);
      if (view) {
        mayTriggerFileMenu({
          app: plugin.app,
          event,
          filePath: relativeVaultPath,
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
    {#if tFile instanceof TFile && !!plugin.app.viewRegistry?.getTypeByExtension(tFile.extension)}
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
