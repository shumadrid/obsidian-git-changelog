import type { GitChangelogPlugin } from 'GitChangelogPlugin.svelte.ts';
import type { PromiseResolve } from 'obsidian-dev-utils/Async';
import type { ModalOptionsBase } from 'obsidian-dev-utils/obsidian/Modals/ModalBase';
import type { CompareRepoCommitsViewState } from 'types.ts';

import { ButtonComponent, moment } from 'obsidian';
import { CssClass } from 'obsidian-dev-utils/CssClass';
import { ModalBase } from 'obsidian-dev-utils/obsidian/Modals/ModalBase';
import { SettingEx } from 'obsidian-dev-utils/obsidian/SettingEx';
import { getTimeZone } from 'settings/ui/CustomTimeZone.ts';
import spacetime from 'spacetime';
import { assertNotNull } from 'utils.ts';

export class CompareVersionsModal extends ModalBase<
  CompareRepoCommitsViewState | undefined,
  ModalOptionsBase
> {
  public plugin: GitChangelogPlugin;

  private olderDate: Date | undefined;
  private newerDate: Date;
  private compareRepoCommitsViewEphemeralState:
    | CompareRepoCommitsViewState
    | undefined;

  public constructor({
    options,
    resolve,
    modalCssClass,
    plugin
  }: {
    options: ModalOptionsBase;
    resolve: PromiseResolve<CompareRepoCommitsViewState | undefined>;
    modalCssClass: string;
    plugin: GitChangelogPlugin;
  }) {
    super(options, resolve, modalCssClass);
    this.plugin = plugin;
    this.newerDate = spacetime.now(getTimeZone(this.plugin)).toNativeDate();
  }

  public override onClose(): void {
    super.onClose();

    this.resolve(this.compareRepoCommitsViewEphemeralState);
  }

  public override onOpen(): void {
    super.onOpen();
    this.contentEl.addClass('git-changelog-checkpoint-modal');

    const titleElement = new SettingEx(this.contentEl);
    titleElement.setName('Compare points in git history');
    titleElement.setDesc(
      `The nearest commit that came before the specified date will be used. Specify the dates in the timezone that's configured in your settings`
    );

    this.createTimeInput({
      text: 'Newer date',
      onChange: (value) => {
        this.newerDate = value;
      },
      startValue: this.newerDate
    });

    this.createTimeInput({
      text: 'Older date',
      onChange: (value) => {
        this.olderDate = value;
      }
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
    startValue?: Date;
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
    if (!this.olderDate || !this.newerDate) {
      return 'Both dates must be selected.';
    }

    // Try parsing both dates - Date.parse returns NaN for invalid dates

    if (!moment.isDate(this.olderDate)) {
      return 'Invalid start date.';
    }
    if (!moment.isDate(this.newerDate)) {
      return 'Invalid end date.';
    }

    // Check if the older date is before the newer date
    return this.olderDate < this.newerDate
      ? undefined
      : 'Start date must be before end date.';
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
        const timeZone = getTimeZone(this.plugin);

        // Swap the timezone, but keep the same date-time
        // Date() doesn't store timezone information.
        const timeZoneAppliedOlderDate = spacetime(
          assertNotNull(this.olderDate)
        ).timezone(timeZone);
        const timeZoneAppliedNewerDate = spacetime(
          assertNotNull(this.newerDate)
        ).timezone(timeZone);

        // Assumes input dates are in the configured timezone, so we need to convert them to UTC, so that git can process them accurately.
        const utcOlderDate = timeZoneAppliedOlderDate.goto('utc');
        const utcNewerDate = timeZoneAppliedNewerDate.goto('utc');

        this.compareRepoCommitsViewEphemeralState = {
          utcOlderDate: utcOlderDate.toNativeDate().toISOString(),
          utcNewerDate: utcNewerDate.toNativeDate().toISOString()
        };

        this.close();
      }
    });
    approveButton.setClass(CssClass.OkButton);
  }
}
