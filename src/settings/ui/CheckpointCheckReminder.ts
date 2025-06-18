import { SettingComponent } from 'settings/components/setting.ts';

export class CheckpointCheckReminder extends SettingComponent {
  public display(): void {
    this.createSetting()

      .setName('Checkpoint reminder interval')
      .setDesc(
        createFragment((fragment) => {
          fragment.appendText(
            'How much minutes need to pass since the last checkpoint to get reminded to verify the new changes made inside the vault. The algorithm is naive for simplicity.'
          );
          fragment.createEl('br');
          fragment.appendText('Set 0 to disable reminders.');
        })
      )
      .addNumber((text) => {
        this.settingTab.bind(text, 'checkpointReminderInterval');
      });
  }
}
