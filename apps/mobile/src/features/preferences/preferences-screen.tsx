import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import {
  palette,
  radius,
  spacing,
  touchTargets,
  typography,
} from '@atlas/design-tokens';
import { Badge, Button, Card } from '@atlas/mobile-ui';

const rows = [
  ['Tema', 'Sistem'],
  ['Dil', 'Türkçe'],
  ['Saat dilimi', 'Europe/Istanbul'],
  ['Varsayılan piyasa', 'BIST'],
  ['Benchmark', 'BIST 100'],
  ['Sayı gösterimi', 'tr-TR · TRY'],
  ['Grafik zaman aralığı', '1 gün'],
  ['Bildirim özeti', 'Uygulama içi'],
  ['Sessiz saatler', 'Kapalı'],
  ['Biyometrik giriş', 'Kapalı'],
  ['Azaltılmış hareket', 'Sistem'],
  ['Kompakt görünüm', 'Kapalı'],
  ['Metodoloji ayrıntısı', 'Standart'],
] as const;

export function PreferencesScreen() {
  const [version, setVersion] = useState(1);
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Temel tercihler
      </Text>
      <Badge label={`SERVER_BACKED · VERSION ${version}`} />
      {rows.map(([label, value]) => (
        <Card key={label}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </Card>
      ))}
      <Button
        label="Tercihleri kaydet"
        onPress={() => setVersion((value) => value + 1)}
      />
      <Text style={styles.note}>
        Güncelleme expectedVersion ile yapılır. 409 conflict kullanıcının
        değişikliğini sessizce ezmez.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/(onboarding)')}
        style={styles.action}
      >
        <Text>Onboarding’i sıfırla</Text>
      </Pressable>
      <Badge label="VoiceOver: ACCEPTED_PRODUCT_WAIVER · FOLLOW-UP TASK-100K" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  action: {
    borderColor: palette.border,
    borderRadius: radius.button,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  label: { color: palette.textSecondary, ...typography.styles.labelMedium },
  note: { color: palette.textMuted, ...typography.styles.bodySmall },
  screen: {
    backgroundColor: palette.background,
    flexGrow: 1,
    gap: spacing[12],
    padding: spacing[24],
    paddingTop: spacing[48],
  },
  title: { color: palette.navy900, ...typography.styles.titleLarge },
  value: { color: palette.textPrimary, ...typography.styles.bodyLarge },
});
