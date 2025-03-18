import { GitChangelogSetting } from 'settings/components/setting.ts';

export class AutoCommitDisabledWarning extends GitChangelogSetting {
  public display(): void {
    try {
      const gitPlugin = this.plugin.getGitPlugin();
      if (
        !this.plugin.settings.autoCommitDisabledWarningDismissed &&
        gitPlugin.settings.autoSaveInterval <= 0
      ) {
        const warningSetting = this.createSetting()
          .setName('⚠️ Auto-commit setting not enabled')
          .setDesc(
            "It's recommended to enable this setting in Git plugin's settings."
          )
          .setClass('git-changelog-warning')
          .addButton((button) => {
            button.setButtonText('Dismiss');
            button.onClick(() => {
              warningSetting.settingEl.remove();

              const newSettings = this.plugin.settingsClone;
              newSettings.autoCommitDisabledWarningDismissed = true;
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.plugin.saveSettings(newSettings);
            });
          });
      }
    } catch {
      /* Empty */
    }
  }
}
