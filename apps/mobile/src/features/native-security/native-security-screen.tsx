import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Badge, Button, Card } from '@atlas/mobile-ui';
import {
  fixtureEnabledAtCompileTime,
  securityFixtureLabel,
} from './native-security-evidence-data';

type SecurityView =
  | 'offline-market'
  | 'offline-portfolio'
  | 'expired-cache'
  | 'mutation-blocked'
  | 'privacy-cover'
  | 'app-lock'
  | 'biometric-fallback'
  | 'security-settings'
  | 'clear-cache'
  | 'share-warning'
  | 'invalid-report'
  | 'invalid-link'
  | 'unauthorized'
  | 'capture-warning'
  | 'privacy-cleanup'
  | 'network-unavailable';

const copy: Record<
  SecurityView,
  {
    readonly title: string;
    readonly eyebrow: string;
    readonly summary: string;
    readonly state: string;
    readonly rows: readonly (readonly [string, string])[];
    readonly action: string;
  }
> = {
  'offline-market': {
    title: 'Piyasa · çevrimdışı',
    eyebrow: 'SALT OKUNUR ÖNBELLEK',
    summary: 'Son doğrulanmış görünüm; canlı veri değildir.',
    state: 'OFFLINE · CACHED AT 18:10',
    rows: [
      ['Veri zamanı', '8 Ağu 18:05'],
      ['Tazelik', 'Gecikmiş'],
      ['Değişiklik', 'Çevrimdışıyken kapalı'],
    ],
    action: 'Bağlantıyı yeniden dene',
  },
  'offline-portfolio': {
    title: 'Portföy · gizli özet',
    eyebrow: 'FINANCIAL_SENSITIVE',
    summary: 'Bakiye ve kâr/zarar privacy mode ile maskelendi.',
    state: 'OFFLINE · READ_ONLY',
    rows: [
      ['Portföy değeri', '••••••'],
      ['Pozisyonlar', 'Önbellekten'],
      ['Son hesaplama', '8 Ağu 17:55'],
    ],
    action: 'Bağlantıyı denetle',
  },
  'expired-cache': {
    title: 'Önbellek süresi doldu',
    eyebrow: 'EXPIRED_OFFLINE_CACHE',
    summary: 'Süresi aşılmış finansal veri gösterilmedi.',
    state: 'SAFE CLOSED',
    rows: [
      ['Sınıf', 'FINANCIAL_SENSITIVE'],
      ['TTL', '5 dakika'],
      ['Sunulan değer', 'Yok'],
    ],
    action: 'Çevrimiçi yeniden yükle',
  },
  'mutation-blocked': {
    title: 'İşlem çevrimdışıyken kapalı',
    eyebrow: 'OFFLINE_MUTATION_BLOCKED',
    summary: 'Talep sıraya alınmadı ve başarı gösterilmedi.',
    state: 'QUEUE DISABLED',
    rows: [
      ['Otomatik tekrar', 'Kapalı'],
      ['Sunucu değişikliği', 'Yapılmadı'],
      ['Form', 'Cihazda gönderilmedi'],
    ],
    action: 'Tamam',
  },
  'privacy-cover': {
    title: 'ATLAS',
    eyebrow: 'GİZLİLİK ÖRTÜSÜ',
    summary: 'Hassas içerik uygulama değiştiricide gizlendi.',
    state: 'APP INACTIVE',
    rows: [
      ['Portföy', 'Gizli'],
      ['Raporlar', 'Gizli'],
      ['Oturum formu', 'Gizli'],
    ],
    action: 'Atlas’a dön',
  },
  'app-lock': {
    title: 'Atlas kilitli',
    eyebrow: 'LOCAL PRIVACY GATE',
    summary: 'Bu kilit backend oturumunun yerine geçmez.',
    state: 'BIOMETRIC REQUIRED',
    rows: [
      ['Politika', 'Hemen'],
      ['Oturum', 'Yeniden doğrulanır'],
      ['İptal', 'Kilitli kalır'],
    ],
    action: 'Face ID ile kilidi aç',
  },
  'biometric-fallback': {
    title: 'Kimlik doğrulama gerekli',
    eyebrow: 'BIOMETRIC UNAVAILABLE',
    summary: 'Biyometrik veri tutulmaz; şifreyle güvenli dönüş kullanılabilir.',
    state: 'REAUTHENTICATION_REQUIRED',
    rows: [
      ['Face ID', 'Kullanılamıyor'],
      ['Cihaz fallback', 'Kapalı'],
      ['Backend kimliği', 'Ayrı doğrulanır'],
    ],
    action: 'Şifre ile devam et',
  },
  'security-settings': {
    title: 'Güvenlik ve gizlilik',
    eyebrow: 'CİHAZ KONTROLLERİ',
    summary: 'Yerel kilit, capture uyarısı ve veri temizleme ayarları.',
    state: 'OWNER SCOPED',
    rows: [
      ['Uygulama kilidi', 'Kısa bekleme'],
      ['Ekran yakalama', 'Risk azaltma açık'],
      ['Arka plan', 'Finansal işlem yok'],
    ],
    action: 'Kilit süresini değiştir',
  },
  'clear-cache': {
    title: 'Yerel önbelleği temizle?',
    eyebrow: 'AÇIK ONAY',
    summary: 'Sunucudaki hesap veya portföy verileri silinmez.',
    state: 'PRIVATE CACHE + TEMP FILES',
    rows: [
      ['Oturum', 'Korunacak'],
      ['Offline veriler', 'Silinecek'],
      ['Geçici raporlar', 'Silinecek'],
    ],
    action: 'Yerel verileri temizle',
  },
  'share-warning': {
    title: 'Hassas raporu paylaş',
    eyebrow: 'TEMPORARY_SENSITIVE',
    summary: 'Sahiplik ve dosya bütünlüğü paylaşmadan önce yeniden doğrulanır.',
    state: 'CONFIRMATION REQUIRED',
    rows: [
      ['Signed URL', 'Paylaşılmaz'],
      ['Geçici dosya', '15 dakika'],
      ['İptal sonrası', 'Temizlenir'],
    ],
    action: 'Doğrula ve paylaş',
  },
  'invalid-report': {
    title: 'Rapor açılamadı',
    eyebrow: 'DOWNLOAD_VALIDATION_FAILED',
    summary: 'Süresi dolmuş veya beklenmeyen dosya güvenli biçimde reddedildi.',
    state: 'SAFE CLOSED',
    rows: [
      ['HTTPS', 'Zorunlu'],
      ['MIME / boyut', 'Doğrulanamadı'],
      ['Yerel kopya', 'Temizlendi'],
    ],
    action: 'Raporu yeniden oluştur',
  },
  'invalid-link': {
    title: 'Bağlantı geçersiz',
    eyebrow: 'ROUTE NOT ALLOWLISTED',
    summary: 'Bu bağlantı Atlas içinde güvenli bir hedefe yönlenmiyor.',
    state: 'NO ARBITRARY ROUTE',
    rows: [
      ['Şema', 'Doğrulandı'],
      ['Parametre', 'Reddedildi'],
      ['Navigation history', 'Temiz'],
    ],
    action: 'Ana ekrana dön',
  },
  unauthorized: {
    title: 'Bu kaynağa erişilemiyor',
    eyebrow: 'OWNERSHIP REVALIDATION',
    summary: 'Kaynak kimliği yetki değildir; backend sahipliği doğrulayamadı.',
    state: 'SAFE FALLBACK',
    rows: [
      ['Resource ID', 'UI’da gizli'],
      ['Cache', 'Gösterilmedi'],
      ['Pending target', 'Temizlendi'],
    ],
    action: 'Güvenli başlangıca dön',
  },
  'capture-warning': {
    title: 'Ekran yakalama algılandı',
    eyebrow: 'RİSK AZALTMA',
    summary: 'iOS ekran görüntüsünü mutlak engelleme garantisi verilmez.',
    state: 'SCREEN CAPTURE RISK',
    rows: [
      ['Hassas görünüm', 'Maskelenebilir'],
      ['Uyarı', 'Etkin'],
      ['Mutlak engel iddiası', 'Yok'],
    ],
    action: 'Anladım',
  },
  'privacy-cleanup': {
    title: 'Yerel gizlilik temizliği',
    eyebrow: 'OWNER CLEANUP',
    summary: 'Hesap değişimi ve çıkışta özel cihaz durumu temizlenir.',
    state: 'CROSS-USER LEAKAGE: 0',
    rows: [
      ['Sorgu cache', 'Temiz'],
      ['Geçici dosya', 'Temiz'],
      ['Pending link / push', 'Temiz'],
    ],
    action: 'Temizliği çalıştır',
  },
  'network-unavailable': {
    title: 'Ağ kullanılamıyor',
    eyebrow: 'NETWORK UNKNOWN',
    summary: 'Provider durumu ile cihaz bağlantısı birbirine karıştırılmaz.',
    state: 'NO MUTATION REPLAY',
    rows: [
      ['Reachability', 'Bilinmiyor'],
      ['Otomatik submit', 'Yok'],
      ['Dönüşte refresh', 'Bounded'],
    ],
    action: 'Yeniden dene',
  },
};

export function NativeSecurityScreen() {
  const params = useLocalSearchParams<{
    fixture?: string;
    view?: SecurityView;
  }>();
  const fixture =
    __DEV__ && fixtureEnabledAtCompileTime && params.fixture === '1';
  if (!fixture) {
    return (
      <ScrollView
        contentContainerStyle={styles.screen}
        testID="native-security-production-safe"
      >
        <AppHeader title="Güvenlik" subtitle="Cihaz ve gizlilik kontrolleri" />
        <Card>
          <Text style={styles.body}>
            Test güvenlik yüzeyleri production build’de kullanılamaz.
          </Text>
        </Card>
      </ScrollView>
    );
  }
  const view =
    params.view && params.view in copy ? params.view : 'security-settings';
  const content = copy[view];
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      testID={`native-security-${view}`}
    >
      <AppHeader title={content.title} subtitle="iOS yerel güvenlik durumu" />
      <Badge label={securityFixtureLabel} />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{content.eyebrow}</Text>
        <Text style={styles.title}>{content.summary}</Text>
        <Badge label={content.state} />
      </View>
      <Card>
        {content.rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text
              accessibilityLabel={`${label}: ${value}`}
              style={styles.value}
            >
              {value}
            </Text>
          </View>
        ))}
      </Card>
      <Button label={content.action} onPress={() => undefined} />
      <Text style={styles.disclosure}>
        Offline mutation queue kapalı · cihaz sinyali authentication değildir ·
        VoiceOver NOT_EXECUTED / USER_ACCEPTED_DOCUMENTED_EXCEPTION
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F1E8',
    flexGrow: 1,
    gap: 14,
    padding: 20,
    paddingTop: 54,
  },
  hero: { backgroundColor: '#07111F', borderRadius: 4, gap: 14, padding: 24 },
  eyebrow: {
    color: '#72E2B6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: { color: '#F8FAFC', fontSize: 25, fontWeight: '700', lineHeight: 31 },
  row: {
    borderBottomColor: '#D8D2C7',
    borderBottomWidth: 1,
    gap: 5,
    paddingVertical: 13,
  },
  label: {
    color: '#5E6572',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  value: { color: '#111827', fontSize: 16, fontWeight: '700' },
  body: { color: '#111827', fontSize: 16, lineHeight: 23 },
  disclosure: { color: '#5E6572', fontSize: 12, lineHeight: 18 },
});
