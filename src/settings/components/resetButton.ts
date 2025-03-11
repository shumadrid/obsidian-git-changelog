import { ButtonComponent } from 'obsidian';

export class ResetButton extends ButtonComponent {
  public constructor(protected contentElement: HTMLElement) {
    super(contentElement);
    this.setTooltip('Restore default');
    this.setIcon('rotate-ccw');
    this.render();
  }

  private render(): void {
    this.buttonEl.classList.add('clickable-icon');
    this.buttonEl.classList.add('extra-setting-button');
  }
}
