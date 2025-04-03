import { GitChangelogSetting } from 'settings/components/setting.ts';

export class WhitespaceSettingsHeading extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setHeading()
      .setName('Whitespace settings')
      .setDesc(
        `Note that adjusting these settings will make the generated stats slightly differ from the diff view, because unlike the diff algorithm, these settings can't be applied globally.`
      );
  }
}
