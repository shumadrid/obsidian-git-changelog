<script lang="ts">
  import type { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type GitChangelogPlugin from 'main.ts';
  import type { GitChangelogSettings } from 'settings/settings.ts';

  import {
    COMPARED_VERSIONS_DATE_SEPARATOR_ICON,
    COPY_COMMIT_HASH_ICON,
    TOGGLE_FILES_SUMMARY_OPTION_ICON
  } from 'constants.ts';
  import { getCommitTimestampOrUndefined } from 'core/gitOperations/getCommitTimestamp.ts';
  import { runRepoDiff } from 'core/gitOperations/runRepoDiff.ts';
  import { setIcon } from 'obsidian';
  import { CssClass } from 'obsidian-dev-utils/CssClass';
  import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
  import { onDestroy, onMount } from 'svelte';
  import { FileSummariesDisplayMode } from 'types.ts';
  import { assertNotNull } from 'utils.ts';
  import DependenciesStatusCheck from 'Views/components/DependenciesStatusCheck.svelte';
  import { formatFullDate } from 'Views/formatters.ts';
  import VersionComponent from 'Views/VaultChangelog/components/Version.svelte';

  // eslint-disable-next-line capitalized-comments
  // svelte-ignore non_reactive_update
  enum ModalCheckpointState {
    Loading = 'Loading...',
    OnCheckpointCommit = 'No commits occurred since the last checkpoint.',
    NoCommits = 'No commits in the repository.',
    NoCheckpoints = 'No checkpoints yet.',
    CheckpointCommitNoLongerExists = 'The commit tied to the last checkpoint no longer exists or the checkpoint value is corrupted.',
    NoChanges = 'No committed included changes since the last checkpoint.',
    Loaded = 'Loaded',
    UnknownError = 'Unknown error occurred.'
  }

  interface Properties {
    plugin: GitChangelogPlugin;
    closeView: () => void;
  }

  const { plugin, closeView }: Properties = $props();

  let filesSummaryDisplayModeButton = $state<HTMLElement>();
  let version = $state<VaultChangelogEntry>();
  let startingCheckpointDate = $state<string>();
  let latestStateDate = $state<string>();

  let upperCommitHash: string | undefined;
  let modalCheckpointState = $state<ModalCheckpointState>(
    ModalCheckpointState.Loading
  );
  let approveButtonText = $state<string>('Loading...');
  let setCta = $state<boolean>(false);
  let showFilesCountSummariesMode = $state(
    FileSummariesDisplayMode.TextAndBinary
  );

  let arrowIconElement = $state<HTMLElement>();
  let onCheckpointCommitIconElement = $state<HTMLElement>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function toggleFilesSummaryOption(): void {
    showFilesCountSummariesMode =
      showFilesCountSummariesMode === FileSummariesDisplayMode.Total
        ? FileSummariesDisplayMode.TextAndBinary
        : FileSummariesDisplayMode.Total;
  }

  async function onApproveButtonClick(event: MouseEvent): Promise<void> {
    event.stopPropagation();

    // UpperCommitHash could be cleaned up
    const checkpointToSave = upperCommitHash;
    closeView();

    if (checkpointToSave) {
      await plugin.settingsManager.editAndSave(
        (settings: GitChangelogSettings): void => {
          // We only save the latest commit as a new checkpoint if the user closes the temporary view by clicking "approve".
          // Otherwise we don't change anything.
          settings.checkpointCommits.push(checkpointToSave);
        }
      );
    }
  }

  onMount(async () => {
    try {
      const git = await plugin.getGit();

      const upperCommit = await getCommitTimestampOrUndefined({
        abortSignal: new AbortController().signal,
        git,
        timeZone: getTimeZone(plugin)
      });
      if (!upperCommit) {
        // If the repo has no commits, git will throw this error:
        // "Fatal: your current branch 'main' does not have any commits yet"
        // And the upperCommit will be undefined.
        modalCheckpointState = ModalCheckpointState.NoCommits;
        approveButtonText = 'Close';

        // Don't show approve button, because if upperCommit doesn't exist, then that means there are no commits in the repo, so we don't have anything to save as a checkpoint anyway.
        return;
      }

      // Save this because if the user clicks "approve" we need to register the latest commit as the latest checkpoint.
      //  We can't depend on the version.commitHash because version might not get computed in certain states (most common scenario is when there are no previous checkpoints).
      upperCommitHash = upperCommit.hash;

      const lowerCommitHash = plugin.settings.checkpointCommits.at(-1);
      if (!lowerCommitHash) {
        // There are no checkpoints to compare to.
        modalCheckpointState = ModalCheckpointState.NoCheckpoints;

        setCta = true;
        approveButtonText = 'Create first checkpoint';
        return;
      }

      if (lowerCommitHash === upperCommit.hash) {
        modalCheckpointState = ModalCheckpointState.OnCheckpointCommit;

        // Do not show the "approve" button because there is no point in registering the same commit as the last checkpoint.
        approveButtonText = 'Close';

        // Show the date of the latest commit if this is the case
        latestStateDate = formatFullDate(
          upperCommit.timeZoneAdjustedDate.toNativeDate(),
          plugin.localeSafe,
          getTimeZone(plugin)
        );
        return;
      }

      const lowerCommit = await getCommitTimestampOrUndefined({
        abortSignal: new AbortController().signal,
        commitHash: lowerCommitHash,
        git,
        timeZone: getTimeZone(plugin)
      });

      if (!lowerCommit) {
        // The passed commit hash was corrupted (that's possible because it's read from data.json) or the commit no longer exists (is deleted from repo).
        // If it's some other error like GitPluginMissingError, then that will be handled and displayed over this in DependenciesStatusCheck anyway, so it doesn't need to be accurate here
        modalCheckpointState =
          ModalCheckpointState.CheckpointCommitNoLongerExists;

        setCta = true;
        approveButtonText = 'Create new checkpoint';
        return;
      }

      startingCheckpointDate = formatFullDate(
        lowerCommit.timeZoneAdjustedDate.toNativeDate(),
        plugin.localeSafe,
        getTimeZone(plugin)
      );

      version = await runRepoDiff({
        git,
        oldCommit: lowerCommit,
        newCommit: upperCommit,
        abortSignal: new AbortController().signal,
        convertToIncludeList: plugin.settings.convertToIncludeList,
        diffAlgorithm: plugin.settings.diffAlgorithm,
        excludeFilesAndFoldersLines:
          plugin.settings.excludeFilesAndFoldersLines,
        ignoreBlankLines: plugin.settings.ignoreBlankLines,
        enableExclusionList: plugin.settings.enableExclusionList,
        renameDetectionStrictness: plugin.settings.renameDetectionStrictness,
        renameLimit: plugin.settings.renameLimit,
        whitespaceIgnoreMode: plugin.settings.whitespaceIgnoreMode,
        emptyTreeHash: await plugin.getEmptyTreeHash(),
        plugin
      });

      latestStateDate = formatFullDate(
        upperCommit.timeZoneAdjustedDate.toNativeDate(),
        plugin.localeSafe,
        getTimeZone(plugin)
      );

      // If you pass identical commit hashes to git diff, or if there are no changes, it will just output nothing.
      modalCheckpointState = version
        ? ModalCheckpointState.Loaded
        : ModalCheckpointState.NoChanges;

      setCta = true;
      approveButtonText = 'Create new checkpoint';
    } catch {
      modalCheckpointState = ModalCheckpointState.UnknownError;
      approveButtonText = 'Close';
    }
  });

  $effect(() => {
    if (arrowIconElement) {
      setIcon(arrowIconElement, COMPARED_VERSIONS_DATE_SEPARATOR_ICON);
    }

    if (onCheckpointCommitIconElement) {
      setIcon(onCheckpointCommitIconElement, COPY_COMMIT_HASH_ICON);
    }

    if (filesSummaryDisplayModeButton) {
      setIcon(filesSummaryDisplayModeButton, TOGGLE_FILES_SUMMARY_OPTION_ICON);
    }
  });

  onDestroy(() => {
    filesSummaryDisplayModeButton = undefined;
    arrowIconElement = undefined;
    onCheckpointCommitIconElement = undefined;
  });
</script>

<div class="git-changelog-view">
  <!-- {#if !compactMode} -->
  <div class="nav-header git-changelog-force-center">
    <div class="nav-buttons-container git-changelog-top-margin">
      <button
        type="submit"
        disabled={modalCheckpointState === ModalCheckpointState.Loading}
        class={`${setCta ? 'mod-cta ' : ''}${CssClass.OkButton}`}
        onclick={onApproveButtonClick}
      >
        {approveButtonText}
      </button>
    </div>
  </div>
  <DependenciesStatusCheck {plugin}>
    <div class="git-changelog-compared-versions-container">
      {#if startingCheckpointDate && (modalCheckpointState === ModalCheckpointState.Loaded || modalCheckpointState === ModalCheckpointState.NoChanges)}
        <div class="git-changelog-compared-version-title">
          {startingCheckpointDate}
        </div>
        <span
          class="git-changelog-compared-version-title-arrow icon git-changelog-stat-color"
          bind:this={arrowIconElement}
        ></span>
      {/if}
      <div class="git-changelog-compared-version-title">
        <!-- ' ' because it serves as a space placeholder -->
        {latestStateDate &&
        modalCheckpointState !== ModalCheckpointState.Loading &&
        modalCheckpointState !== ModalCheckpointState.UnknownError
          ? latestStateDate
          : '　'}
      </div>
    </div>
    <div class="nav-files-container">
      {#if modalCheckpointState === ModalCheckpointState.Loaded}
        <VersionComponent
          version={assertNotNull(version)}
          {plugin}
          hideTitleAndMakeUncollapsible={true}
          showFilesCountSummaries={showFilesCountSummariesMode}
        />
      {:else}
        <div class="pane-empty git-changelog-git-issue">
          {#if modalCheckpointState === ModalCheckpointState.OnCheckpointCommit}
            <span
              class="icon git-changelog-on-checkpoint-commit-icon"
              bind:this={onCheckpointCommitIconElement}
            ></span>
          {/if}
          {modalCheckpointState}
        </div>
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
</style>
