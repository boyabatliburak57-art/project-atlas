import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme, spacing } from '@atlas/design-tokens';
import {
  appHeaderOwnsSystemInset,
  isTabRoute,
  safeAreaProviderAddsVisualPadding,
  screenContentBottomSpacing,
  screenSafeAreaEdges,
  tabBarBottomInset,
} from './safe-area-contract';

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const values = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((left, right) => right - left);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe('shared mobile safe-area and header contract', () => {
  it('makes the shared screen shell own the top inset', () => {
    expect(screenSafeAreaEdges(['search'])).toContain('top');
  });

  it('does not let AppHeader or the provider double the inset', () => {
    expect(appHeaderOwnsSystemInset).toBe(false);
    expect(safeAreaProviderAddsVisualPadding).toBe(false);
  });

  it('delegates the bottom system inset to tab navigation', () => {
    expect(isTabRoute(['(tabs)', 'radar', 'scanner'])).toBe(true);
    expect(screenSafeAreaEdges(['(tabs)', 'radar'])).toEqual(['top']);
    expect(tabBarBottomInset(34)).toBe(34);
  });

  it('keeps deterministic scroll spacing so the last item is reachable', () => {
    expect(screenContentBottomSpacing()).toBe(spacing[16]);
  });

  it('does not permit a negative bottom-tab inset', () => {
    expect(tabBarBottomInset(-1)).toBe(0);
  });

  it('meets dark header icon contrast semantics', () => {
    expect(
      contrast(darkTheme.header.icon, darkTheme.header.background),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('meets light header icon contrast semantics', () => {
    expect(
      contrast(lightTheme.header.icon, lightTheme.header.background),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps hub header actions on the shared semantic primitive', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, 'hub-screens.tsx'),
      'utf8',
    );
    expect(source.match(/<GlobalActionButton/gu)).toHaveLength(3);
    expect(source).not.toMatch(/globalActionLink/u);
  });

  it('places Scanner under Radar inside the shared inset shell', () => {
    const source = readFileSync(
      resolve(
        import.meta.dirname,
        '../features/operations/operations-screens.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('<SafeAreaScrollScreen');
    expect(source).not.toMatch(/function Screen[\s\S]{0,250}<ScrollView/u);
  });

  it('gives modal and non-tab routes both exposed safe-area edges', () => {
    expect(screenSafeAreaEdges(['modal'])).toEqual(['top', 'bottom']);
    expect(screenSafeAreaEdges(['profile'])).toEqual(['top', 'bottom']);
  });

  it('uses the shared non-scroll safe-area shell for the Global Search list', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../features/market/market-screens.tsx'),
      'utf8',
    );
    expect(source).toContain('<SafeAreaScreen style={styles.searchScreen}');
  });
});
