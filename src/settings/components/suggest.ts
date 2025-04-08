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
    const timeZones: string[] = [];

    for (const timeZone of TIME_ZONES_LIST) {
      if (timeZone.toLowerCase().contains(lowerCaseInputString)) {
        timeZones.push(timeZone);
      }
    }

    return timeZones;
  }

  public renderSuggestion(timeZone: string, element: HTMLElement): void {
    element.setText(timeZone);
  }

  public override selectSuggestion(timeZone: string): void {
    this.inputEl.value = timeZone;
    this.inputEl.trigger('input');
    this.close();
  }
}
