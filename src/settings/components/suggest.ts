import type { App } from 'obsidian';

import { AbstractInputSuggest } from 'obsidian';
import { TIME_ZONES_LIST } from 'settings/settings.ts';

export class TimeZoneSuggest extends AbstractInputSuggest<string> {
  private inputEl: HTMLInputElement;

  public constructor(app: App, inputElement: HTMLInputElement) {
    super(app, inputElement);
    this.inputEl = inputElement;
  }

  public getSuggestions(inputString: string): string[] {
    const lowerCaseInputString = inputString.toLowerCase();
    const timezones: string[] = [];

    for (const timezone of TIME_ZONES_LIST) {
      if (timezone.toLowerCase().contains(lowerCaseInputString)) {
        timezones.push(timezone);
      }
    }

    return timezones;
  }

  public renderSuggestion(timezone: string, element: HTMLElement): void {
    element.setText(timezone);
  }

  public override selectSuggestion(timezone: string): void {
    this.inputEl.value = timezone;
    this.inputEl.trigger('input');
    this.close();
  }
}
