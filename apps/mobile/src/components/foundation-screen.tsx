import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, spacing, typography } from '@atlas/design-tokens';

export function FoundationScreen({
  title,
  children,
}: PropsWithChildren<{ readonly title: string }>) {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.copy}>
        Architecture placeholder — feature UI is not implemented.
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: palette.textSecondary,
    ...typography.styles.bodyMedium,
  },
  screen: {
    backgroundColor: palette.background,
    flex: 1,
    gap: spacing[16],
    padding: spacing[24],
  },
  title: {
    color: palette.textPrimary,
    ...typography.styles.titleLarge,
  },
});
