import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  darkTheme,
  lightTheme,
  radius,
  spacing,
  touchTargets,
  typography,
  type AtlasTheme,
} from '@atlas/design-tokens';
import {
  formatNavigationAccessibilityLabel,
  formatNavigationBadge,
  navigationKind,
  visibleNavigationItems,
} from './navigation-model';
export {
  formatNavigationAccessibilityLabel,
  formatNavigationBadge,
  navigationKind,
  visibleNavigationItems,
} from './navigation-model';

export interface NavigationItem {
  readonly key: string;
  readonly label: string;
  readonly icon: ReactNode;
  readonly badge?: number;
  readonly disabled?: boolean;
  readonly visible?: boolean;
  readonly testID?: string;
}

interface NavigationProps {
  readonly items: readonly NavigationItem[];
  readonly activeKey: string;
  readonly onSelect: (key: string, reselected: boolean) => void;
  readonly theme?: AtlasTheme;
  readonly safeAreaBottom?: number;
}

function NavigationButton({
  item,
  selected,
  expanded,
  onPress,
  theme,
}: {
  readonly item: NavigationItem;
  readonly selected: boolean;
  readonly expanded: boolean;
  readonly onPress: () => void;
  readonly theme: AtlasTheme;
}) {
  const badge = formatNavigationBadge(item.badge);
  return (
    <Pressable
      accessibilityHint={
        selected
          ? 'Sekme köküne dönmek için tekrar seçin'
          : `${item.label} bölümünü açar`
      }
      accessibilityLabel={formatNavigationAccessibilityLabel(
        item.label,
        item.badge,
      )}
      accessibilityRole="tab"
      accessibilityState={{ disabled: item.disabled, selected }}
      disabled={item.disabled}
      onPress={onPress}
      style={[
        styles.item,
        expanded && styles.expandedItem,
        selected && { backgroundColor: theme.surfaceSecondary },
      ]}
      testID={item.testID ?? `navigation-${item.key}`}
    >
      <View accessibilityElementsHidden style={styles.icon}>
        {item.icon}
      </View>
      {expanded ? (
        <Text
          allowFontScaling
          maxFontSizeMultiplier={1.4}
          numberOfLines={2}
          style={[
            typography.styles.labelSmall,
            { color: selected ? theme.primary : theme.textSecondary },
            selected && styles.selectedLabel,
          ]}
        >
          {item.label}
        </Text>
      ) : null}
      {badge ? (
        <Text
          accessibilityElementsHidden
          maxFontSizeMultiplier={1.4}
          importantForAccessibility="no"
          style={[styles.badge, { backgroundColor: theme.financial.negative }]}
        >
          {badge}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function BottomNavigation({
  items,
  activeKey,
  onSelect,
  theme = lightTheme,
  safeAreaBottom = 0,
}: NavigationProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bottom,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          paddingBottom: safeAreaBottom,
        },
      ]}
    >
      {visibleNavigationItems(items).map((item) => (
        <NavigationButton
          key={item.key}
          item={item}
          selected={item.key === activeKey}
          expanded
          onPress={() => onSelect(item.key, item.key === activeKey)}
          theme={theme}
        />
      ))}
    </View>
  );
}

export function NavigationRail({
  items,
  activeKey,
  onSelect,
  theme = lightTheme,
  expanded = false,
}: NavigationProps & { readonly expanded?: boolean }) {
  return (
    <View
      accessibilityLabel="Tablet navigation"
      accessibilityRole="tablist"
      style={[
        styles.rail,
        expanded && styles.railExpanded,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      {visibleNavigationItems(items).map((item) => (
        <NavigationButton
          key={item.key}
          item={item}
          selected={item.key === activeKey}
          expanded={expanded}
          onPress={() => onSelect(item.key, item.key === activeKey)}
          theme={theme}
        />
      ))}
    </View>
  );
}

export function AdaptiveNavigationShell({
  width,
  children,
  ...props
}: NavigationProps & { readonly width: number; readonly children: ReactNode }) {
  const kind = navigationKind(width);
  if (kind === 'bottom')
    return (
      <View style={styles.shell}>
        <View style={styles.content}>{children}</View>
        <BottomNavigation {...props} />
      </View>
    );
  return (
    <View style={[styles.shell, styles.horizontal]}>
      <NavigationRail {...props} expanded={kind === 'rail-expanded'} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export const navigationThemes = { light: lightTheme, dark: darkTheme };

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    color: lightTheme.inverse,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 18,
    overflow: 'hidden',
    paddingHorizontal: spacing[4],
    position: 'absolute',
    right: spacing[4],
    textAlign: 'center',
    top: spacing[2],
  },
  bottom: { borderTopWidth: 1, flexDirection: 'row' },
  content: { flex: 1 },
  expandedItem: { flex: 1 },
  horizontal: { flexDirection: 'row' },
  icon: { alignItems: 'center', height: 22, justifyContent: 'center' },
  item: {
    alignItems: 'center',
    borderRadius: radius.medium,
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    minWidth: touchTargets.minimum,
    padding: spacing[4],
  },
  rail: {
    borderRightWidth: 1,
    bottom: 0,
    gap: spacing[4],
    left: 0,
    padding: spacing[8],
    position: 'absolute',
    top: 0,
    width: 72,
  },
  railExpanded: { width: 240 },
  selectedLabel: { fontWeight: '700', textDecorationLine: 'underline' },
  shell: { flex: 1 },
});
