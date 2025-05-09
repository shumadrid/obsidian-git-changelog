<script lang="ts">
  import type { VaultChangelogEntry } from 'core/ChangelogEntry.svelte.ts';
  import type GitChangelogPlugin from 'main.ts';

  import {
    COMPARED_VERSIONS_DATE_SEPARATOR_ICON,
    COPY_COMMIT_HASH_ICON,
    TOGGLE_FILES_SUMMARY_OPTION_ICON
  } from 'constants.ts';
  import { findFirstCommitBefore } from 'core/gitOperations/findFirstCommitBefore.ts';
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
  enum CompareVersionsState {
    Loading = 'Loading...',
    OnCheckpointCommit = 'Specified dates fall inside the same commit.',
    BeforeInitialCommit = 'Both dates are before the initial commit.',
    NoChanges = 'The versions are the same.',
    Loaded = 'Loaded',
    UnknownError = 'Unknown error occurred.'
  }

  interface Properties {
    plugin: GitChangelogPlugin;
    closeView: () => void;
    utcOlderDate: string;
    utcNewerDate: string;
  }

  const { plugin, closeView, utcOlderDate, utcNewerDate }: Properties =
    $props();

  let filesSummaryDisplayModeButton = $state<HTMLElement>();
  let version = $state<VaultChangelogEntry>();
  let timezoneAdjustedOlderDate = $state<string>();
  let timezoneAdjustedNewerDate = $state<string>();

  let compareVersionsState = $state<CompareVersionsState>(
    CompareVersionsState.Loading
  );

  const showFilesCountSummariesMode = FileSummariesDisplayMode.TextAndBinary;

  let arrowIconElement = $state<HTMLElement>();
  let sameCommitIconElement = $state<HTMLElement>();

  onMount(async () => {
    try {
      const git = await plugin.getGit();
      const timeZone = getTimeZone(plugin);

      const upperCommit = await findFirstCommitBefore({
        abortSignal: new AbortController().signal,
        isoString: utcNewerDate,
        git,
        timeZone
      });
      if (!upperCommit) {
        // Since the newer date must be newer than the older date and the newer date is already older than the first commit, that means both dates belong to the time before the repository was created and therefore when comparing the state of the repository between these two dates, the state is the same: non-existent.
        compareVersionsState = CompareVersionsState.BeforeInitialCommit;
        return;
      }

      let lowerCommitIsEmptyTree = false;
      let lowerCommit = await findFirstCommitBefore({
        abortSignal: new AbortController().signal,
        isoString: utcOlderDate,
        git,
        timeZone
      });
      if (!lowerCommit) {
        lowerCommitIsEmptyTree = true;

        lowerCommit = {
          hash: await plugin.getEmptyTreeHash(),
          // This date won't be used in this scenario, so we can set it to anything.
          timeZoneAdjustedDate: upperCommit.timeZoneAdjustedDate
        };
      }

      timezoneAdjustedNewerDate = formatFullDate(
        upperCommit.timeZoneAdjustedDate.toNativeDate(),
        plugin.localeSafe,
        getTimeZone(plugin)
      );

      if (lowerCommit.hash === upperCommit.hash) {
        compareVersionsState = CompareVersionsState.OnCheckpointCommit;
        // Show the single date of the commit if this is the case
        return;
      }

      // Potentially indicate that we're comparing to empty state because the provided older date is older than the repository
      timezoneAdjustedOlderDate = lowerCommitIsEmptyTree
        ? 'Beginning'
        : formatFullDate(
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
        enableExclusionList: plugin.settings.enableExclusionList,
        ignoreBlankLines: plugin.settings.ignoreBlankLines,
        renameDetectionStrictness: plugin.settings.renameDetectionStrictness,
        renameLimit: plugin.settings.renameLimit,
        whitespaceIgnoreMode: plugin.settings.whitespaceIgnoreMode,
        emptyTreeHash: await plugin.getEmptyTreeHash(),
        plugin
      });

      // If you pass identical commit hashes to git diff, or if there are no changes, it will just output nothing.
      compareVersionsState = version
        ? CompareVersionsState.Loaded
        : CompareVersionsState.NoChanges;
    } catch {
      compareVersionsState = CompareVersionsState.UnknownError;
    }
  });

  $effect(() => {
    if (arrowIconElement) {
      setIcon(arrowIconElement, COMPARED_VERSIONS_DATE_SEPARATOR_ICON);
    }

    if (sameCommitIconElement) {
      setIcon(sameCommitIconElement, COPY_COMMIT_HASH_ICON);
    }

    if (filesSummaryDisplayModeButton) {
      setIcon(filesSummaryDisplayModeButton, TOGGLE_FILES_SUMMARY_OPTION_ICON);
    }
  });

  onDestroy(() => {
    filesSummaryDisplayModeButton = undefined;
    arrowIconElement = undefined;
    sameCommitIconElement = undefined;
  });
</script>

<div class="git-changelog-view">
  <div class="nav-header git-changelog-force-center">
    <div class="nav-buttons-container git-changelog-top-margin">
      <button type="button" class={CssClass.OkButton} onclick={closeView}>
        Exit comparison
      </button>
    </div>
  </div>
  <DependenciesStatusCheck {plugin}>
    <div class="git-changelog-compared-versions-container">
      {#if timezoneAdjustedOlderDate && (compareVersionsState === CompareVersionsState.Loaded || compareVersionsState === CompareVersionsState.NoChanges)}
        <div class="git-changelog-compared-version-title">
          {timezoneAdjustedOlderDate}
        </div>
        <span
          class="git-changelog-compared-version-title-arrow icon git-changelog-4stat-color"
          bind:this={arrowIconElement}
        ></span>
      {/if}
      <div class="git-changelog-compared-version-title">
        <!-- ' ' because it serves as a space placeholder -->
        {timezoneAdjustedNewerDate &&
        compareVersionsState !== CompareVersionsState.Loading &&
        compareVersionsState !== CompareVersionsState.UnknownError
          ? timezoneAdjustedNewerDate
          : '　'}
      </div>
    </div>
    <div class="nav-files-container">
      {#if compareVersionsState === CompareVersionsState.Loaded}
        <VersionComponent
          version={assertNotNull(version)}
          {plugin}
          hideTitleAndMakeUncollapsible={true}
          showFilesCountSummaries={showFilesCountSummariesMode}
        />
      {:else}
        <div class="pane-empty git-changelog-git-issue">
          {#if compareVersionsState === CompareVersionsState.OnCheckpointCommit}
            <span
              class="icon git-changelog-on-checkpoint-commit-icon"
              bind:this={sameCommitIconElement}
            ></span>
          {/if}
          {compareVersionsState}
        </div>
      {/if}
    </div>
  </DependenciesStatusCheck>
</div>

<style lang="scss">
</style>
