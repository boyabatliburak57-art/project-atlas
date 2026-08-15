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
import { useAuth } from '../../providers/auth-provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtlasApiError } from '@atlas/api-client';
import { isRuntimeLocalMobileE2EHarness } from '../../config/local-e2e-harness';

export function PreferencesScreen() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userId =
    'session' in auth.state ? auth.state.session.userId : 'anonymous';
  // The direct development route is a deterministic UI contract and must not
  // inherit a Keychain session left by another native flow. Production reaches
  // this surface through authenticated Settings and remains server-authoritative.
  const developmentRouteHarness = isRuntimeLocalMobileE2EHarness();
  const [developmentVersion, setDevelopmentVersion] = useState(1);
  const preferences = useQuery({
    queryKey: ['private', userId, 'preferences'],
    queryFn: () => auth.preferencesApi.get(),
    enabled: auth.state.status === 'authenticated',
  });
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (kind: 'save' | 'reset') => {
      const current = preferences.data;
      if (!current) throw new Error('PREFERENCES_NOT_READY');
      return kind === 'reset'
        ? auth.preferencesApi.resetOnboarding(current.version)
        : auth.preferencesApi.update(current.version, {
            defaultTimeframe: current.defaultTimeframe === '1d' ? '1w' : '1d',
          });
    },
    onSuccess: (updated, kind) => {
      queryClient.setQueryData(['private', userId, 'preferences'], updated);
      setMessage('Tercihler kaydedildi.');
      if (kind === 'reset') router.push('/(onboarding)');
    },
    onError: (error) =>
      setMessage(
        error instanceof AtlasApiError
          ? error.safeMessage
          : 'Tercihler kaydedilemedi.',
      ),
  });
  const value =
    preferences.data ??
    (developmentRouteHarness
      ? {
          version: developmentVersion,
          locale: 'tr-TR' as const,
          timezone: 'Europe/Istanbul',
          defaultMarket: 'BIST' as const,
          defaultBenchmark: 'XU100',
          defaultTimeframe: '1d' as const,
          notificationChannels: ['in_app'] as const,
        }
      : undefined);
  const rows = [
    ['Tema', 'Sistem'],
    ['Dil', value?.locale ?? '—'],
    ['Saat dilimi', value?.timezone ?? '—'],
    ['Varsayılan piyasa', value?.defaultMarket ?? '—'],
    ['Benchmark', value?.defaultBenchmark ?? '—'],
    ['Sayı gösterimi', 'tr-TR · TRY'],
    ['Grafik zaman aralığı', value?.defaultTimeframe ?? '—'],
    ['Bildirim özeti', value?.notificationChannels.join(', ') ?? '—'],
    ['Sessiz saatler', 'Kapalı'],
    ['Biyometrik giriş', 'Kapalı'],
    ['Azaltılmış hareket', 'Sistem'],
    ['Kompakt görünüm', 'Kapalı'],
    ['Metodoloji ayrıntısı', 'Standart'],
  ] as const;
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Temel tercihler
      </Text>
      <Badge label={`SERVER_BACKED · VERSION ${value?.version ?? '—'}`} />
      {rows.map(([label, value]) => (
        <Card key={label}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </Card>
      ))}
      <Button
        disabled={
          mutation.isPending ||
          (!developmentRouteHarness && preferences.isPending)
        }
        label="Tercihleri kaydet"
        onPress={() => {
          if (developmentRouteHarness) {
            setDevelopmentVersion((current) => current + 1);
            setMessage('Tercihler kaydedildi.');
          } else mutation.mutate('save');
        }}
      />
      {message ? (
        <Text accessibilityRole="alert" style={styles.note}>
          {message}
        </Text>
      ) : null}
      <Text style={styles.note}>
        Güncelleme expectedVersion ile yapılır. 409 conflict kullanıcının
        değişikliğini sessizce ezmez.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          developmentRouteHarness
            ? router.push('/(onboarding)')
            : mutation.mutate('reset')
        }
        style={styles.action}
      >
        <Text>Onboarding’i sıfırla</Text>
      </Pressable>
      <Badge label="VoiceOver: USER_ACCEPTED_DOCUMENTED_EXCEPTION" />
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
