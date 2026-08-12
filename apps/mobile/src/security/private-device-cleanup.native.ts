import { nativeReportFileManager } from './native-files';

export function cleanupPrivateDeviceState(): Promise<void> {
  nativeReportFileManager.cleanupAll();
  return Promise.resolve();
}

export function cleanupStartupSensitiveFiles(): Promise<void> {
  nativeReportFileManager.cleanupAll();
  return Promise.resolve();
}
