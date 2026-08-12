import { useEffect, useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  palette,
  radius,
  spacing,
  touchTargets,
  typography,
} from '@atlas/design-tokens';
import { Badge, Button, OfflineState } from '@atlas/mobile-ui';
import {
  loginSchema,
  normalizeEmail,
  resetPasswordSchema,
} from './auth-contracts';
import { useAuth } from '../../providers/auth-provider';
import { AtlasApiError } from '@atlas/api-client';

type AuthScreenKind =
  | 'welcome'
  | 'login'
  | 'registration'
  | 'verification'
  | 'forgot'
  | 'reset'
  | 'expired'
  | 'locked';

export function AuthScreen({ kind }: { readonly kind: AuthScreenKind }) {
  if (kind === 'welcome') return <Welcome />;
  if (kind === 'registration') return <RegistrationUnavailable />;
  if (kind === 'verification') return <Verification />;
  if (kind === 'expired' || kind === 'locked')
    return <SessionState kind={kind} />;
  return <AuthForm kind={kind} />;
}

function Shell({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Welcome() {
  return (
    <Shell title="Atlas">
      <Badge label="BIST ODAKLI FİNANSAL ANALİZ" />
      <Text style={styles.hero}>
        Piyasayı sakin ve güvenilir bir çerçevede analiz edin.
      </Text>
      <Text style={styles.copy}>
        Tarama kriterlerini çalıştırın, alarmlarınızı yönetin, portföy riskini
        izleyin ve stratejilerinizi geçmiş verilerle test edin. Atlas yatırım
        tavsiyesi vermez.
      </Text>
      <Button label="Giriş yap" onPress={() => router.push('/(auth)/login')} />
      <Button
        label="Hesap erişimi"
        onPress={() => router.push('/(auth)/register')}
      />
      <View style={styles.links}>
        <Link href="/legal">Kullanım Koşulları</Link>
        <Link href="/legal">Gizlilik Bildirimi</Link>
        <Link href="/legal">Yatırım Riski Açıklaması</Link>
      </View>
      <Text style={styles.warning}>
        LEGAL_REVIEW_REQUIRED · NOT_FOR_PRODUCTION_PUBLICATION
      </Text>
    </Shell>
  );
}

function AuthForm({ kind }: { kind: 'login' | 'forgot' | 'reset' }) {
  const auth = useAuth();
  const parameters = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const title =
    kind === 'login'
      ? 'Giriş yap'
      : kind === 'forgot'
        ? 'Şifremi unuttum'
        : 'Yeni şifre';
  const submit = async () => {
    if (pending) return;
    if (kind === 'forgot') {
      if (!loginSchema.shape.email.safeParse(email).success)
        setMessage('Geçerli bir e-posta adresi girin.');
      else {
        setPending(true);
        try {
          await auth.requestPasswordReset(email);
          setMessage('Hesap uygunsa şifre sıfırlama talimatı gönderilecektir.');
        } catch (error) {
          setMessage(
            error instanceof AtlasApiError
              ? error.safeMessage
              : 'İstek tamamlanamadı.',
          );
        } finally {
          setPending(false);
        }
      }
      return;
    }
    if (kind === 'reset') {
      const result = resetPasswordSchema.safeParse({ password, confirmation });
      if (!result.success) {
        setMessage(result.error.issues[0]?.message ?? 'Şifre doğrulanamadı.');
        return;
      }
      if (
        typeof parameters.token !== 'string' ||
        parameters.token.length < 32
      ) {
        setMessage('Sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
        return;
      }
      setPending(true);
      try {
        await auth.confirmPasswordReset(parameters.token, password);
        setPassword('');
        setConfirmation('');
        router.replace('/(auth)/login');
      } catch (error) {
        setMessage(
          error instanceof AtlasApiError
            ? error.safeMessage
            : 'Şifre güncellenemedi.',
        );
      } finally {
        setPending(false);
      }
      return;
    }
    const result = loginSchema.safeParse({
      email: normalizeEmail(email),
      password,
    });
    if (!result.success)
      setMessage(
        result.error.issues[0]?.message ?? 'Giriş bilgileri doğrulanamadı.',
      );
    else {
      setPending(true);
      try {
        const verificationRequired = await auth.login(email, password);
        router.replace(
          verificationRequired ? '/(auth)/verification' : '/(onboarding)',
        );
      } catch (error) {
        setMessage(
          error instanceof AtlasApiError
            ? error.safeMessage
            : 'Giriş güvenli şekilde tamamlanamadı.',
        );
      } finally {
        setPending(false);
      }
    }
  };
  return (
    <Shell title={title}>
      {kind !== 'reset' ? (
        <LabeledInput
          autoComplete="email"
          keyboardType="email-address"
          label="E-posta"
          onChangeText={setEmail}
          textContentType="username"
          value={email}
          testID="auth-email"
        />
      ) : null}
      {kind !== 'forgot' ? (
        <LabeledInput
          autoComplete={kind === 'login' ? 'current-password' : 'new-password'}
          label={kind === 'login' ? 'Şifre' : 'Yeni şifre'}
          onChangeText={setPassword}
          secureTextEntry={!visible}
          textContentType={kind === 'login' ? 'password' : 'newPassword'}
          value={password}
          testID="auth-password"
        />
      ) : null}
      {kind === 'reset' ? (
        <LabeledInput
          autoComplete="new-password"
          label="Yeni şifre tekrar"
          onChangeText={setConfirmation}
          secureTextEntry={!visible}
          textContentType="newPassword"
          value={confirmation}
          testID="auth-password-confirmation"
        />
      ) : null}
      {kind !== 'forgot' ? (
        <Pressable
          accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
          accessibilityRole="button"
          onPress={() => setVisible((value) => !value)}
          style={styles.touch}
        >
          <Text>{visible ? 'Şifreyi gizle' : 'Şifreyi göster'}</Text>
        </Pressable>
      ) : null}
      {message ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          {message}
        </Text>
      ) : null}
      <Button
        disabled={pending}
        label={
          pending
            ? 'İşlem sürüyor'
            : kind === 'forgot'
              ? 'Sıfırlama bağlantısı iste'
              : kind === 'reset'
                ? 'Şifreyi güncelle'
                : 'Giriş yap'
        }
        onPress={() => void submit()}
      />
      {kind === 'login' ? (
        <Link href="/(auth)/forgot-password">Şifremi unuttum</Link>
      ) : (
        <Link href="/(auth)/login">Giriş ekranına dön</Link>
      )}
      <OfflineState />
    </Shell>
  );
}

function LabeledInput(
  props: React.ComponentProps<typeof TextInput> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        allowFontScaling
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

function RegistrationUnavailable() {
  return (
    <Shell title="Hesap oluşturma">
      <Badge label="REGISTRATION_NOT_AVAILABLE" />
      <Text style={styles.copy}>
        Public kayıt backend tarafından desteklenmiyor. Mevcut veya davetle
        oluşturulmuş hesabınızla giriş yapın.
      </Text>
      <Button
        label="Giriş yap"
        onPress={() => router.replace('/(auth)/login')}
      />
    </Shell>
  );
}

function Verification() {
  const auth = useAuth();
  const developmentRouteHarness =
    __DEV__ &&
    auth.state.status !== 'authenticated' &&
    auth.state.status !== 'verificationRequired';
  const parameters = useLocalSearchParams<{ token?: string }>();
  const [maskedEmail, setMaskedEmail] = useState('e***@example.com');
  const [message, setMessage] = useState('Doğrulama durumu kontrol ediliyor.');
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const refresh = async () => {
    try {
      const response = await auth.verificationStatus();
      setMaskedEmail(response.data.maskedEmail);
      setResendAvailableAt(response.data.resendAvailableAt);
      if (response.data.verified) {
        setMessage('E-posta adresiniz doğrulandı.');
        router.replace('/(onboarding)');
      } else setMessage('Hesabınıza tam erişim için e-postanızı doğrulayın.');
    } catch (error) {
      setMessage(
        error instanceof AtlasApiError
          ? error.safeMessage
          : 'Doğrulama durumu alınamadı.',
      );
    }
  };
  useEffect(() => {
    const token = parameters.token;
    if (developmentRouteHarness && typeof token !== 'string') {
      setMessage('Hesabınıza tam erişim için e-postanızı doğrulayın.');
      return;
    }
    if (typeof token !== 'string') {
      void refresh();
      return;
    }
    setPending(true);
    void auth
      .confirmVerification(token)
      .then(() => {
        setMessage('E-posta adresiniz doğrulandı.');
        router.replace('/(onboarding)');
      })
      .catch((error: unknown) =>
        setMessage(
          error instanceof AtlasApiError
            ? error.safeMessage
            : 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.',
        ),
      )
      .finally(() => setPending(false));
  }, [developmentRouteHarness, parameters.token]);
  const resend = async () => {
    if (pending) return;
    if (developmentRouteHarness) {
      setMessage('Doğrulama teslimatı güvenli şekilde sıraya alındı.');
      return;
    }
    setPending(true);
    try {
      const response = await auth.resendVerification();
      setResendAvailableAt(response.data.resendAvailableAt);
      setMessage('Doğrulama teslimatı güvenli şekilde sıraya alındı.');
    } catch (error) {
      setMessage(
        error instanceof AtlasApiError
          ? error.safeMessage
          : 'Doğrulama isteği tamamlanamadı.',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Shell title="E-posta doğrulaması">
      <Badge label="TRANSACTIONAL_EMAIL · SANDBOX_INTEGRATION" />
      <Text style={styles.copy}>
        Doğrulama bağlantısı {maskedEmail} adresine gönderilir. Bağlantı tek
        kullanımlıdır ve süresi sınırlıdır.
      </Text>
      <Text accessibilityRole="alert" style={styles.warning}>
        {message}
      </Text>
      {resendAvailableAt ? (
        <Text style={styles.copy}>Yeniden gönderim: {resendAvailableAt}</Text>
      ) : null}
      <Button
        disabled={pending}
        label={
          pending ? 'İşlem sürüyor' : 'Doğrulama bağlantısını yeniden gönder'
        }
        onPress={() => void resend()}
      />
      <Button label="Durumu yenile" onPress={() => void refresh()} />
      <Button
        label="Hesap değiştir"
        onPress={() =>
          void auth
            .logout()
            .catch(() => undefined)
            .finally(() => router.replace('/(auth)/login'))
        }
      />
    </Shell>
  );
}

function SessionState({ kind }: { kind: 'expired' | 'locked' }) {
  return (
    <Shell
      title={
        kind === 'expired' ? 'Oturum süresi doldu' : 'Hesap kullanılamıyor'
      }
    >
      <Text accessibilityRole="alert" style={styles.copy}>
        {kind === 'expired'
          ? 'Güvenliğiniz için yeniden giriş yapın.'
          : 'Hesap güvenlik nedeniyle kilitli. Destek ekibiyle iletişime geçin.'}
      </Text>
      <Button
        label="Giriş yap"
        onPress={() => router.replace('/(auth)/login')}
      />
    </Shell>
  );
}

const styles = StyleSheet.create({
  copy: { color: palette.textSecondary, ...typography.styles.bodyLarge },
  field: { gap: spacing[4] },
  flex: { flex: 1 },
  hero: { color: palette.navy900, ...typography.styles.displayMedium },
  input: {
    borderColor: palette.border,
    borderRadius: radius.button,
    borderWidth: 1,
    minHeight: touchTargets.minimum,
    padding: spacing[12],
    ...typography.styles.bodyLarge,
  },
  label: { color: palette.textPrimary, ...typography.styles.labelLarge },
  links: { gap: spacing[12] },
  screen: {
    backgroundColor: palette.background,
    flexGrow: 1,
    gap: spacing[20],
    padding: spacing[24],
    paddingTop: spacing[64],
  },
  title: { color: palette.navy900, ...typography.styles.titleLarge },
  touch: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
  },
  warning: { color: palette.warning700, ...typography.styles.bodySmall },
});
