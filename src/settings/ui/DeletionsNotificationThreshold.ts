import { GitChangelogSetting } from 'settings/components/setting.ts';

export class DeletionsNotificationThreshold extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Notify on large amount of changes.')
      .setDesc(
        'Notify if changes between neighboring commits exceed a threshold, which can be a sign of data loss or corruption.'
      )
      .addToggle((toggle) =>
        toggle
          .setValue(
            this.plugin.settings
              .notifyOnContentDeletionsAndMovesThresholdReached
          )
          .onChange((value) => {
            const newSettings = this.plugin.settingsClone;
            newSettings.notifyOnContentDeletionsAndMovesThresholdReached =
              value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);

            this.refreshDisplaySmooth();
          })
      );
  }
}
