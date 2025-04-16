import { SettingComponent } from 'settings/components/setting.ts';

export class ContentDeletionsMovesThreshold extends SettingComponent {
  public display(): void {
    this.createSetting()
      .setName('Custom threshold for deletions/moves alert')
      .setDesc(
        "Acceptable amount of deletions and moves between commits. Represents either words or lines, depending on your setup. Note that this doesn't mean between each interval but between the actual commits, meaning if your auto-commit interval is five minutes, this will trigger only if you manage to delete that many files inside those five minutes, which usually signals corruption or data loss."
      )
      .addText((text) => {
        text.setDisabled(this.disabled);
        // This.restrictToPositiveIntegerInput(text);

        this.settingTab.bind(text, 'contentDeletionsAndMovesWarningThreshold');
      });
  }
}
