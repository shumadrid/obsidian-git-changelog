import { GitChangelogSetting } from 'settings/components/setting.ts';

export class StatusBarStatsToggle extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setName('Active note live status bar stats')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.statusBarStats)
          .onChange((value) => {
            this.refreshDisplayDelayed();

            const newSettings = this.plugin.settingsClone;
            newSettings.statusBarStats = value;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.plugin.saveSettings(newSettings);

            if (value) {
              this.plugin.initStatusBar();
            } else {
              this.plugin.statusBarStats?.destroy?.();
              this.plugin.statusBarStats = undefined;
            }
          })
      );
  }
}
