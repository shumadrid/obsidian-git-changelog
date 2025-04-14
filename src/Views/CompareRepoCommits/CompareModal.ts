import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
import type { PromiseResolve } from 'obsidian-dev-utils/Async';
import type { ModalOptionsBase } from 'obsidian-dev-utils/obsidian/Modals/ModalBase';
import type { CompareRepoCommitsViewState } from 'types.ts';

import { ButtonComponent, moment } from 'obsidian';
import { CssClass } from 'obsidian-dev-utils/CssClass';
import { ModalBase } from 'obsidian-dev-utils/obsidian/Modals/ModalBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';
import { assertNotNull } from 'utils.ts';

export class CompareVersionsModal extends ModalBase<
  CompareRepoCommitsViewState | undefined,
  ModalOptionsBase
> {
  public plugin: GitChangelogPlugin;

  // Date-time component automatically converts dates to the system timezone in the UI and stores them as UTC
  private utcOlderDate: Date | undefined;
  private utcNewerDate: Date;
  private compareRepoCommitsViewEphemeralState:
    | CompareRepoCommitsViewState
    | undefined;

  public constructor({
    options,
    resolve,
    modalCssClass,
    plugin,
    utcOlderDateString,
    utcNewerDateString
  }: {
    options: ModalOptionsBase;
    resolve: PromiseResolve<CompareRepoCommitsViewState | undefined>;
    modalCssClass: string;
    plugin: GitChangelogPlugin;
    utcOlderDateString: string | undefined;
    utcNewerDateString: string | undefined;
  }) {
    super(options, resolve, modalCssClass);
    this.plugin = plugin;

    // Load the newer date from the previous modal or if this is the first time the user is comparing in this Obsidian session then assign the current date
    this.utcNewerDate = utcNewerDateString
      ? new Date(utcNewerDateString)
      : new Date();
    if (utcOlderDateString) {
      this.utcOlderDate = new Date(utcOlderDateString);
    }
  }

  public override onClose(): void {
    super.onClose();

    this.resolve(this.compareRepoCommitsViewEphemeralState);
  }

  public override onOpen(): void {
    super.onOpen();
    this.contentEl.addClass('git-changelog-checkpoint-modal');

    const titleElement = new SettingEx(this.contentEl);
    titleElement.setName('Compare two vault states in git history');
    titleElement.setDesc(
      createFragment((fragment) => {
        fragment.appendText(
          `The nearest commit that came before the each specified date will be used.`
        );
        fragment.createEl('br');
        fragment.appendText(
          `Specify the dates in your system timezone (not the one configured in the plugin settings).`
        );
      })
    );

    this.createTimeInput({
      text: 'Newer date',
      onChange: (value) => {
        this.utcNewerDate = value;
      },
      startValue: this.utcNewerDate
    });

    this.createTimeInput({
      text: 'Older date',
      onChange: (value) => {
        this.utcOlderDate = value;
      },
      startValue: this.utcOlderDate
    });

    this.createCompareButton();
  }

  private createTimeInput({
    onChange,
    text,
    startValue
  }: {
    onChange: (value: Date) => void;
    text: string;
    startValue: Date | undefined;
  }): void {
    const setting = new SettingEx(this.contentEl);

    setting.setName(text).addDateTime((dateTime) => {
      if (startValue) {
        dateTime.setValue(startValue);
      }
      dateTime.onChange(onChange);
    });
  }

  private validateDates(): string | undefined {
    if (!this.utcOlderDate || !this.utcNewerDate) {
      return 'Both dates must be selected.';
    }

    // Try parsing both dates
    if (!moment.isDate(this.utcOlderDate)) {
      return 'Invalid start date.';
    }
    if (!moment.isDate(this.utcNewerDate)) {
      return 'Invalid end date.';
    }

    // Check if the older date is before the newer date
    return this.utcOlderDate < this.utcNewerDate
      ? undefined
      : 'Older date must be before the newer date.';
  }

  private createCompareButton(): void {
    const approveButton = new ButtonComponent(this.contentEl);
    approveButton.setButtonText('Compare');
    approveButton.setCta();
    approveButton.onClick(() => {
      const validationMessage = this.validateDates();

      if (validationMessage) {
        this.plugin.displayNotice(validationMessage);
      } else {
        //  Input dates are in UTC, so that git can process them accurately.
        this.compareRepoCommitsViewEphemeralState = {
          utcOlderDate: assertNotNull(this.utcOlderDate).toISOString(),
          utcNewerDate: this.utcNewerDate.toISOString()
        };

        this.close();
      }
    });
    approveButton.setClass(CssClass.OkButton);
  }
}
