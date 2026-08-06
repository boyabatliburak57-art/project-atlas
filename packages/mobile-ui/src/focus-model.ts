export class FocusLifecycle {
  private trigger: number | null = null;
  private open = false;
  captureTrigger(node: number | null) {
    this.trigger = node;
  }
  opened() {
    if (this.open)
      throw new Error('Nested modal focus lifecycle is prohibited');
    this.open = true;
  }
  closed(fallback: number | null = null) {
    this.open = false;
    return this.trigger ?? fallback;
  }
  isOpen() {
    return this.open;
  }
}
