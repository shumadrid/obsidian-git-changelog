import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
import type { GitChangelogSettings } from 'settings/settings.ts';
import type { CompareRepoCommitsViewState } from 'types.ts';

import {
  COMPARE_REPO_COMMITS_VIEW_CONFIG,
  COMPARE_TO_CHECKPOINT_VIEW_CONFIG
} from 'constants.ts';
import { CssClass } from 'obsidian-dev-utils/CssClass';
import { showModal } from 'obsidian-dev-utils/obsidian/Modals/ModalBase';
import { openCompareToCheckpointView } from 'settings/ui/ReviewChangesReminderInterval.ts';
import { removeCompareVersionsView } from 'utils.ts';
import { CompareVersionsModal } from 'Views/CompareRepoCommits/CompareModal.ts';
import { FILE_CHANGELOG_VIEW_CONFIG } from 'Views/FileChangelog/FileChangelog.ts';
import { VAULT_CHANGELOG_VIEW_CONFIG } from 'Views/VaultChangelog/VaultChangelog.ts';

export function addCommands(plugin: GitChangelogPlugin): void {
  const app = plugin.app;

  plugin.addCommand({
    callback: async () => {
      await app.workspace.ensureSideLeaf(
        VAULT_CHANGELOG_VIEW_CONFIG.type,
        'left',
        { reveal: true }
      );
    },
    id: `open-${VAULT_CHANGELOG_VIEW_CONFIG.type}`,
    name: `Open ${VAULT_CHANGELOG_VIEW_CONFIG.name.toLocaleLowerCase()} view`
  });

  plugin.addCommand({
    callback: async () => {
      await app.workspace.ensureSideLeaf(
        FILE_CHANGELOG_VIEW_CONFIG.type,
        'right',
        { reveal: true }
      );
    },
    id: `open-${FILE_CHANGELOG_VIEW_CONFIG.type}`,
    name: `Open ${FILE_CHANGELOG_VIEW_CONFIG.name.toLocaleLowerCase()} view`
  });

  plugin.addCommand({
    callback: async () => {
      await openCompareToCheckpointView(plugin);
    },
    id: `show-${COMPARE_TO_CHECKPOINT_VIEW_CONFIG.type}`,
    name: `Show ${COMPARE_TO_CHECKPOINT_VIEW_CONFIG.name.toLocaleLowerCase()}`
  });

  plugin.addCommand({
    callback: async () => {
      await plugin.settingsManager.editAndSave(
        (settings: GitChangelogSettings): void => {
          settings.enableExclusionList = !settings.enableExclusionList;
        }
      );

      // Hotkeys or the command palette don't work in the settings tab under normal circumstances so we don't have to handle refreshing the settingsTab display
      plugin.displayNotice(
        plugin.settings.enableExclusionList
          ? 'Exclusion list enabled.'
          : 'Exclusion list disabled.',
        // eslint-disable-next-line no-magic-numbers
        1500
      );
    },
    id: `toggle-exclusion-list`,
    name: `Toggle exclusion list`
  });

  addCompareRepoVersionsCommand(plugin);
}

function addCompareRepoVersionsCommand(plugin: GitChangelogPlugin): void {
  plugin.addCommand({
    id: 'compare-two-versions',
    name: 'Compare two vault states in history',
    callback: async () => {
      // Always returns undefined if the modal was exited without clicking "approve" button.
      const compareRepoCommitsViewState = await showModal<
        CompareRepoCommitsViewState | undefined
      >(
        (resolve) =>
          new CompareVersionsModal({
            plugin,
            resolve,
            modalCssClass: CssClass.ConfirmModal,
            options: {
              app: plugin.app,
              cssClass: CssClass.ConfirmModal
            },
            utcOlderDateString: plugin.compareVersionsUtcOlderDate,
            utcNewerDateString: plugin.compareVersionsUtcNewerDate
          })
      );

      if (compareRepoCommitsViewState) {
        // Close any existing COMPARE_REPO_STATES_VIEW views
        removeCompareVersionsView(plugin);

        plugin.compareVersionsUtcNewerDate =
          compareRepoCommitsViewState.utcNewerDate;
        plugin.compareVersionsUtcOlderDate =
          compareRepoCommitsViewState.utcOlderDate;

        await plugin.app.workspace.ensureSideLeaf(
          COMPARE_REPO_COMMITS_VIEW_CONFIG.type,
          'left',
          { reveal: true }
        );
      }
    }
  });
}
