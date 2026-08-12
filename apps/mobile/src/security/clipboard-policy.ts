import type { MobileDataClass } from './data-classification';
import { MOBILE_DATA_POLICIES } from './data-classification';

export function assertClipboardCopyAllowed(
  classification: MobileDataClass,
  explicitUserAction: boolean,
): void {
  if (
    !explicitUserAction ||
    MOBILE_DATA_POLICIES[classification].clipboard !== 'explicit'
  ) {
    throw new Error('CLIPBOARD_COPY_PROHIBITED');
  }
}
