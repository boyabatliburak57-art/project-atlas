export class ScreenCaptureMitigation {
  start(onScreenshot: () => void): Promise<'unavailable'> {
    void onScreenshot;
    return Promise.resolve('unavailable');
  }
  stop(): Promise<void> {
    return Promise.resolve();
  }
}
