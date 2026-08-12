import * as ScreenCapture from 'expo-screen-capture';

export class ScreenCaptureMitigation {
  private screenshotSubscription: { remove(): void } | null = null;

  async start(onScreenshot: () => void): Promise<'active' | 'unavailable'> {
    if (!(await ScreenCapture.isAvailableAsync())) return 'unavailable';
    await ScreenCapture.enableAppSwitcherProtectionAsync(1);
    this.screenshotSubscription ??=
      ScreenCapture.addScreenshotListener(onScreenshot);
    return 'active';
  }

  async stop(): Promise<void> {
    this.screenshotSubscription?.remove();
    this.screenshotSubscription = null;
    await ScreenCapture.disableAppSwitcherProtectionAsync();
  }
}
