import { spacing } from '@atlas/design-tokens';

export type SafeAreaEdge = 'top' | 'right' | 'bottom' | 'left';

export function isTabRoute(segments: readonly string[]): boolean {
  return segments.includes('(tabs)');
}

export function screenSafeAreaEdges(
  segments: readonly string[],
): readonly SafeAreaEdge[] {
  return isTabRoute(segments) ? ['top'] : ['top', 'bottom'];
}

export function screenContentBottomSpacing(): number {
  return spacing[16];
}

export function tabBarBottomInset(inset: number): number {
  return Math.max(0, inset);
}

export const appHeaderOwnsSystemInset = false;
export const safeAreaProviderAddsVisualPadding = false;
