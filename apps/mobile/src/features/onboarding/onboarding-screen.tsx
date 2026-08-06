import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from '@atlas/domain/preferences';
import {
  palette,
  radius,
  spacing,
  touchTargets,
  typography,
} from '@atlas/design-tokens';
import { Badge, Button, Card } from '@atlas/mobile-ui';
import {
  completeStep,
  skipOptionalStep,
  startOnboarding,
} from './onboarding-model';

const copy: Record<
  OnboardingStep,
  { title: string; detail: string; choices: readonly string[] }
> = {
  disclosure: {
    title: 'Ürün kapsamı ve yasal bildirimler',
    detail:
      'Atlas analiz aracıdır; yatırım tavsiyesi veya emir iletimi sunmaz.',
    choices: [
      'Kullanım Koşulları',
      'Gizlilik Bildirimi',
      'Yatırım Riski Açıklaması',
    ],
  },
  marketLocaleTimezone: {
    title: 'Dil, saat dilimi ve piyasa',
    detail:
      'Piyasa zamanları exchange timezone ile kullanıcı timezone’unu ayrı tutar.',
    choices: ['Türkçe (tr-TR)', 'Europe/Istanbul', 'BIST'],
  },
  benchmark: {
    title: 'Benchmark ve kullanım profili',
    detail:
      'Bu seçim yetkilendirme değildir; yalnız başlangıç deneyimini kişiselleştirir.',
    choices: ['BIST 100', 'BIST 30', 'Investor', 'Analyst / Strategy User'],
  },
  watchlist: {
    title: 'İzleme listesi başlangıcı',
    detail:
      'Canlı fiyat gösterilmez. Mevcut listeyi daha sonra seçebilirsiniz.',
    choices: ['Daha sonra seç', 'Yeni izleme listesi'],
  },
  scannerPreset: {
    title: 'Tarama kriteri başlangıcı',
    detail: 'Preset seçimi tarama çalıştırmaz ve provider yoksa sonuç üretmez.',
    choices: ['Momentum', 'Breakout', 'Volume', 'Trend', 'Daha sonra'],
  },
  notifications: {
    title: 'Bildirim tercihleri',
    detail:
      'Push token kaydı TASK-100F kapsamındadır. Güvenlik bildirimleri kapatılamaz.',
    choices: ['Uygulama içi', 'Push daha sonra', 'Sessiz saatler'],
  },
  demoData: {
    title: 'Biyometri ve demo içerik',
    detail:
      'Biyometri backend girişinin yerine geçmez. Demo kaynaklar belirgin etiketli ve owner-scoped olur.',
    choices: [
      'Face ID’yi daha sonra etkinleştir',
      'Demo içerik oluştur',
      'Demo içerik istemiyorum',
    ],
  },
  summary: {
    title: 'Onboarding özeti',
    detail:
      'Seçimler server-authoritative expectedVersion ile kaydedilir; conflict sessizce ezilmez.',
    choices: [
      'tr-TR · Europe/Istanbul',
      'BIST · XU100',
      'LEGAL_REVIEW_REQUIRED',
    ],
  },
};

export function OnboardingScreen() {
  const [draft, setDraft] = useState(() => startOnboarding());
  const step = draft.state.currentStep;
  const index = ONBOARDING_STEPS.indexOf(step);
  const current = copy[step];
  const progress = useMemo(
    () => `${index + 1}/${ONBOARDING_STEPS.length}`,
    [index],
  );
  const next = () => {
    if (step === 'summary') {
      router.replace('/(tabs)/home');
      return;
    }
    setDraft((value) =>
      completeStep(
        value,
        step,
        step === 'demoData' ? { demoDataRequested: false } : {},
      ),
    );
  };
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Başlangıç ayarları
      </Text>
      <Text
        accessibilityLabel={`Onboarding adımı ${progress}`}
        style={styles.progress}
      >
        {progress}
      </Text>
      <Card>
        <Text style={styles.heading}>{current.title}</Text>
        <Text style={styles.copy}>{current.detail}</Text>
        {current.choices.map((choice) => (
          <Choice key={choice} label={choice} />
        ))}
      </Card>
      {step === 'disclosure' ? (
        <Badge label="LEGAL_REVIEW_REQUIRED · NOT_FOR_PRODUCTION_PUBLICATION" />
      ) : null}
      <Button
        label={
          step === 'summary' ? 'Onboarding’i tamamla' : 'Kaydet ve devam et'
        }
        onPress={next}
      />
      {step !== 'disclosure' && step !== 'summary' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setDraft((value) => skipOptionalStep(value, step))}
          style={styles.touch}
        >
          <Text>Bu adımı geç</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/welcome')}
        style={styles.touch}
      >
        <Text>Daha sonra devam et</Text>
      </Pressable>
      <Text style={styles.note}>
        Progress API: `/me/preferences` + expectedVersion. Offline mutation
        queue kullanılmaz.
      </Text>
    </ScrollView>
  );
}

function Choice({ label }: { label: string }) {
  const [selected, setSelected] = useState(false);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => setSelected((value) => !value)}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    borderColor: palette.border,
    borderRadius: radius.button,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  copy: { color: palette.textSecondary, ...typography.styles.bodyLarge },
  heading: { color: palette.textPrimary, ...typography.styles.titleMedium },
  note: { color: palette.textMuted, ...typography.styles.bodySmall },
  progress: { color: palette.primary600, ...typography.styles.labelLarge },
  screen: {
    backgroundColor: palette.background,
    flexGrow: 1,
    gap: spacing[16],
    padding: spacing[24],
    paddingTop: spacing[48],
  },
  selected: { borderColor: palette.primary600, borderWidth: 2 },
  title: { color: palette.navy900, ...typography.styles.titleLarge },
  touch: { justifyContent: 'center', minHeight: touchTargets.minimum },
});
