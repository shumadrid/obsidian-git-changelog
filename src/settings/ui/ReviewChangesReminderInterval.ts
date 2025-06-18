import type GitChangelogPlugin from 'main.ts';

import { COMPARE_TO_CHECKPOINT_VIEW_CONFIG } from 'constants.ts';
import { Notice } from 'obsidian';
import { invokeAsyncSafely } from 'obsidian-dev-utils/Async';
import { SettingComponent } from 'settings/components/setting.ts';
import { removeCompareVersionsView } from 'utils.ts';

export class ReviewChangesReminderInterval extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName(
        createFragment((fragment) => {
          fragment.appendText('Review changes reminder interval');
          fragment
            .createEl('span', {
              cls: 'nav-file-tag git-changelog-new'
            })
            .setText('NEW');
        })
      )

      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            'How often to remind you to review changes made inside the vault (minutes).'
          );
          fragment.createEl('br');
          fragment.appendText('Set 0 to disable reminders.');
        })
      )
      .addNumber((text) => {
        this.settingTab.bind(text, 'reviewChangesReminderInterval');
      });
  }
}

/**
 * Dismisses the checkpoint reminder notification if present.
 */
export async function dismissCheckpointReminder(
  plugin: GitChangelogPlugin
): Promise<void> {
  if (plugin.checkpointReminderNotice) {
    plugin.checkpointReminderNotice.hide();
    plugin.checkpointReminderNotice = undefined;
  }
  await resetCheckpointReminderCounter(plugin);
}

/**
 * Resets the activeMinutesPassedSinceLastCheckpoint counter in settings.
 */
export async function resetCheckpointReminderCounter(
  plugin: GitChangelogPlugin
): Promise<void> {
  await plugin.settingsManager.editAndSave((settings) => {
    settings.activeMinutesPassedSinceLastCheckpoint = 0;
  });
}

/**
 * Handles the minute interval for checkpoint reminders.
 */
export async function handleReviewChangesReminderInterval(
  plugin: GitChangelogPlugin
): Promise<void> {
  const { reviewChangesReminderInterval } = plugin.settings;
  if (!reviewChangesReminderInterval || reviewChangesReminderInterval <= 0) {
    await dismissCheckpointReminder(plugin);
    return;
  }
  // Don't show if already open
  if (plugin.checkpointReminderNotice) return;

  // Increment counter in settings
  await plugin.settingsManager.editAndSave((settings) => {
    settings.activeMinutesPassedSinceLastCheckpoint =
      (settings.activeMinutesPassedSinceLastCheckpoint || 0) + 1;
  });

  if (
    plugin.settings.activeMinutesPassedSinceLastCheckpoint >=
    reviewChangesReminderInterval
  ) {
    showCheckpointReminder(plugin);
  }
}

/**
 * Shows the checkpoint reminder notification if not already shown.
 */
export function showCheckpointReminder(plugin: GitChangelogPlugin): void {
  if (plugin.checkpointReminderNotice) return;
  const frag = createFragment((element) => {
    element.createEl('span', {
      text: `Git changelog:\nIt's time to review the changes made to your vault. 🧐`
    });
    element.createEl('br');

    const openButton = element.createEl('button', {
      text: 'Review'
    });
    openButton.style.marginTop = '8px';
    openButton.classList.add('mod-cta');
    openButton.addEventListener('click', () => {
      invokeAsyncSafely(() => openCompareToCheckpointView(plugin));
    });
    const dismissButton = element.createEl('button', {
      text: 'Remind me later'
    });
    dismissButton.style.marginLeft = '8px';
    dismissButton.addEventListener('click', () => {
      invokeAsyncSafely(() => dismissCheckpointReminder(plugin));
    });
  });
  plugin.checkpointReminderNotice = new Notice(frag, 0);
}

export async function openCompareToCheckpointView(
  plugin: GitChangelogPlugin
): Promise<void> {
  // First close any existing COMPARE_REPO_STATES_VIEW views
  removeCompareVersionsView(plugin);

  await plugin.app.workspace.ensureSideLeaf(
    COMPARE_TO_CHECKPOINT_VIEW_CONFIG.type,
    'left',
    { reveal: true }
  );

  invokeAsyncSafely(() => dismissCheckpointReminder(plugin));
}
