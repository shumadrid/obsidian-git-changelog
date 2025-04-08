import { SettingComponent } from 'settings/components/setting.ts';

export class DetectMovedContentToggle extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Detect moved lines/words')
      .setDesc(
        `If enabled, changelog will also track all moved words or lines between files or moved to another location in the same file. Adds significant computational overhead that increases with the number and size of changes.`
      )
      .addToggle((toggle) =>
        this.settingTab.bind(toggle, 'detectMovedContent', {
          shouldShowValidationMessage: false
        })
      );
  }
}
