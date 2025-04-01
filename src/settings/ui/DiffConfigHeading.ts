import { GitChangelogSetting } from 'settings/components/setting.ts';

export class DiffConfigHeading extends GitChangelogSetting {
  public display(): void {
    this.createSetting()
      .setHeading()
      .setName('Whitespace settings')
      .setDesc(
        "These settings can't be applied globally, so they apply exclusively to this plugin. The diff view won't follow these settings."
      );
  }
}
