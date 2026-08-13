import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type TextStyle,
} from 'react-native';
import {
  lightTheme,
  radius,
  spacing,
  touchTargets,
  typography,
  type AtlasTheme,
} from '@atlas/design-tokens';
import { formatPercent, formatTry } from '@atlas/financial-formatting';
export const ThemeContext = createContext<AtlasTheme>(lightTheme);
export function ThemeProvider({
  children,
  theme,
}: PropsWithChildren<{ theme: AtlasTheme }>) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}
export function useAtlasTheme() {
  return useContext(ThemeContext);
}
export function AtlasText({
  children,
  role = 'bodyMedium',
  accessibilityRole,
}: PropsWithChildren<{
  role?: keyof typeof typography.styles;
  accessibilityRole?: AccessibilityRole;
}>) {
  const theme = useAtlasTheme();
  return (
    <Text
      allowFontScaling
      accessibilityRole={accessibilityRole}
      style={[
        typography.styles[role] as TextStyle,
        { color: theme.textPrimary },
      ]}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function Button({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={s.button}
      testID={testID}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
}
export function IconButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.touch}
    >
      <Text aria-hidden>•</Text>
    </Pressable>
  );
}
export function FinancialValue({
  value,
  currency = false,
}: {
  value: number | null;
  currency?: boolean;
}) {
  const formatted = currency ? formatTry(value) : String(value ?? '—');
  return (
    <Text
      accessibilityLabel={value === null ? 'Değer mevcut değil' : formatted}
      style={s.financial}
    >
      {formatted}
    </Text>
  );
}
export function FinancialChange({ value }: { value: number | null }) {
  const state =
    value === null ? 'unknown' : value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const sign = state === 'up' ? '▲' : state === 'down' ? '▼' : '—';
  return (
    <Text
      accessibilityLabel={
        state === 'up'
          ? `Yüzde ${formatPercent(value)} yükseldi`
          : state === 'down'
            ? `Yüzde ${formatPercent(Math.abs(value!))} düştü`
            : state === 'flat'
              ? 'Değişim yok'
              : 'Değişim mevcut değil'
      }
      style={{
        color:
          state === 'up'
            ? lightTheme.financial.positive
            : state === 'down'
              ? lightTheme.financial.negative
              : lightTheme.financial.neutral,
      }}
    >
      {sign} {formatPercent(value)}
    </Text>
  );
}
export const ChangeBadge = FinancialChange;
export const PriceDisplay = FinancialValue;
export const PercentageDisplay = FinancialChange;
export const CurrencyDisplay = (p: { value: number | null }) => (
  <FinancialValue {...p} currency />
);
export function Badge({ label }: { label: string }) {
  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={s.badge}>
      <AtlasText role="labelSmall">{label}</AtlasText>
    </View>
  );
}
export const Chip = Badge;
export const Tag = Badge;
export const DemoBadge = () => (
  <Badge label="DEMO_UI_FIXTURE · NOT_LIVE_MARKET_DATA" />
);
export function State({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <View accessibilityRole="alert" style={s.state}>
      <AtlasText role="titleSmall">{title}</AtlasText>
      <AtlasText>{detail}</AtlasText>
      {action}
    </View>
  );
}
export const EmptyState = () => (
  <State
    title="Henüz içerik yok"
    detail="Bu alan ilgili özellik görevi tamamlandığında kullanılabilir."
  />
);
export const ErrorState = () => (
  <State
    title="İstek tamamlanamadı"
    detail="Güvenli hata mesajı ve referans kimliği burada gösterilir."
  />
);
export const OfflineState = () => (
  <State
    title="Çevrimdışı · salt okunur"
    detail="Önbellek zamanı gösterilir; finansal değişiklikler devre dışıdır."
  />
);
export const UnavailableState = () => (
  <State title="Kullanılamıyor" detail="Bu kabiliyet henüz etkin değil." />
);
export const ProviderRequiredState = () => (
  <State
    title="Veri sağlayıcısı gerekli"
    detail="Gerçek sağlayıcı yetkisi olmadan veri gösterilmez."
  />
);
export const NotEvaluableState = () => (
  <State
    title="Hesaplanamıyor"
    detail="Gerekli veri veya metodoloji koşulu sağlanmadı."
  />
);
export const PermissionRequiredState = UnavailableState;
export const MaintenanceState = UnavailableState;
export function DataFreshnessBadge({
  status,
  timestamp,
}: {
  status:
    | 'live'
    | 'delayed'
    | 'stale'
    | 'partial'
    | 'unavailable'
    | 'demo'
    | 'unknown';
  timestamp?: string;
}) {
  return (
    <Badge
      label={`${status.toUpperCase()}${timestamp ? ` · ${timestamp}` : ''}`}
    />
  );
}
export const StaleBanner = () => (
  <State
    title="Gecikmiş veri"
    detail="Son güncelleme zamanı doğrulanmalıdır."
  />
);
export const PartialDataBanner = () => (
  <State title="Kısmi veri" detail="Bazı kaynaklar mevcut değil." />
);
export function TextField({
  label,
  error,
  secure = false,
}: {
  label: string;
  error?: string;
  secure?: boolean;
}) {
  return (
    <View>
      <AtlasText role="labelMedium">{label}</AtlasText>
      <TextInput
        accessibilityHint={error ? `Hata: ${error}` : undefined}
        accessibilityLabel={label}
        accessibilityState={{ disabled: false }}
        secureTextEntry={secure}
        style={s.input}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}
export const SecureTextField = (p: { label: string; error?: string }) => (
  <TextField {...p} secure />
);
export const SearchInput = TextField;
export const NumberField = TextField;
export const DateField = TextField;
export const SelectField = TextField;
export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const theme = useAtlasTheme();
  return (
    <View
      style={[
        s.header,
        {
          backgroundColor: theme.header.background,
          borderBottomColor: theme.header.border,
        },
      ]}
    >
      <View style={s.headerRow}>
        <View style={s.headerCopy}>
          <AtlasText accessibilityRole="header" role="titleLarge">
            {title}
          </AtlasText>
        </View>
        {actions ? (
          <View
            accessibilityLabel="Global actions"
            pointerEvents="box-none"
            style={s.headerActions}
          >
            {actions}
          </View>
        ) : null}
      </View>
      {subtitle ? <AtlasText>{subtitle}</AtlasText> : null}
    </View>
  );
}

export function GlobalActionButton({
  label,
  glyph,
  onPress,
  testID,
}: {
  label: string;
  glyph: string;
  onPress?: () => void;
  testID?: string;
}) {
  const theme = useAtlasTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={spacing[4]}
      onPress={onPress}
      style={({ pressed }) => [
        s.globalAction,
        {
          backgroundColor: pressed
            ? theme.header.pressed
            : theme.header.background,
          borderColor: theme.header.border,
        },
      ]}
      testID={testID}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[s.globalActionGlyph, { color: theme.header.icon }]}
      >
        {glyph}
      </Text>
    </Pressable>
  );
}

export function HubSection({
  title,
  description,
  children,
  testID,
}: PropsWithChildren<{
  title: string;
  description?: string;
  testID?: string;
}>) {
  return (
    <View accessibilityLabel={title} style={s.hubSection} testID={testID}>
      <View style={s.hubSectionHeading}>
        <AtlasText accessibilityRole="header" role="titleSmall">
          {title}
        </AtlasText>
        {description ? (
          <AtlasText role="bodySmall">{description}</AtlasText>
        ) : null}
      </View>
      <View style={s.hubSectionBody}>{children}</View>
    </View>
  );
}

export function FeatureEntryRow({
  title,
  description,
  onPress,
  availabilityLabel,
  disabled = false,
  testID,
}: {
  title: string;
  description: string;
  onPress?: () => void;
  availabilityLabel?: string;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useAtlasTheme();
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={`${title}${availabilityLabel ? `, ${availabilityLabel}` : ''}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.featureEntry,
        { borderBottomColor: theme.border },
        pressed && s.pressed,
      ]}
      testID={testID}
    >
      <View style={s.featureEntryCopy}>
        <AtlasText role="labelLarge">{title}</AtlasText>
        <AtlasText role="bodySmall">{description}</AtlasText>
      </View>
      {availabilityLabel ? <Badge label={availabilityLabel} /> : null}
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ color: theme.textSecondary, fontSize: 22 }}
      >
        ›
      </Text>
    </Pressable>
  );
}

export function ContextualAction({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.contextualAction, pressed && s.pressed]}
      testID={testID}
    >
      <AtlasText role="labelMedium">{label}</AtlasText>
    </Pressable>
  );
}

export function ProfileMenu({ children }: PropsWithChildren) {
  return (
    <View accessibilityLabel="Profil menüsü" style={s.profileMenu}>
      {children}
    </View>
  );
}
export function Screen({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const content = <View style={s.screen}>{children}</View>;
  return scroll ? <ScrollView>{content}</ScrollView> : content;
}
export const ScrollScreen = (p: PropsWithChildren) => (
  <Screen scroll>{p.children}</Screen>
);
export const FixedScreen = Screen;
export const SafeAreaScreen = Screen;
export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <AppHeader
      title={title}
      {...(subtitle === undefined ? {} : { subtitle })}
    />
  );
}
export const PageTitle = AppHeader;
export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <AtlasText role="labelMedium">{label}</AtlasText>
      <AtlasText role="financialMedium">{value}</AtlasText>
    </Card>
  );
}
export const IndexCard = MetricCard;
export const BacktestMetricCard = MetricCard;
export const RiskMetricCard = MetricCard;
export function ListItem({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={s.row}>
      <AtlasText role="labelLarge">{title}</AtlasText>
      {subtitle ? <AtlasText role="bodySmall">{subtitle}</AtlasText> : null}
    </View>
  );
}
export const SymbolRow = ListItem;
export const PositionRow = ListItem;
export const AlertRow = ListItem;
export const ScanResultRow = ListItem;
export const ReportRow = ListItem;
export const StrategyCard = ListItem;
export const WatchlistCard = ListItem;
export function ChartAccessibilitySummary({ summary }: { summary: string }) {
  return <Text accessibilityRole="summary">{summary}</Text>;
}
export function ChartContainer({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <AtlasText role="titleSmall">{title}</AtlasText>
      {children ?? (
        <State
          title="Grafik altyapısı"
          detail="Gerçek grafik motoru ilgili özellik görevine aittir."
        />
      )}
    </Card>
  );
}
export const ChartEmptyState = EmptyState;
export const ChartLegend = ListItem;
export function ResponsiveStack({
  children,
  width,
}: {
  children: ReactNode;
  width: number;
}) {
  return (
    <View
      style={{
        flexDirection: width >= 768 ? 'row' : 'column',
        gap: spacing[16],
      }}
    >
      {children}
    </View>
  );
}
export const AdaptiveGrid = ResponsiveStack;
export const TwoColumnLayout = ResponsiveStack;
export const ThreeColumnLayout = ResponsiveStack;
export const ResponsiveContainer = View;
export const ContentColumn = View;
export const StickyFooter = View;
export const SidebarLayout = ResponsiveStack;
export const SplitView = ResponsiveStack;
export const Divider = () => <View style={s.divider} />;
export const Spinner = () => <Text accessibilityLabel="Yükleniyor">…</Text>;
export const Skeleton = () => (
  <View accessibilityLabel="İçerik yükleniyor" style={s.skeleton} />
);
export const ProgressBar = Badge;
export const Toast = State;
export const SegmentedControl = Badge;
export const Tabs = Badge;
export const Switch = Badge;
export const Checkbox = Badge;
export const Radio = Badge;
export const Avatar = Badge;
export const Tooltip = State;
export const MethodologyButton = Button;
export const MarketStatusBadge = Badge;
const s = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  button: {
    alignItems: 'center',
    backgroundColor: lightTheme.primary,
    borderRadius: radius.button,
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    paddingHorizontal: spacing[16],
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  card: {
    backgroundColor: lightTheme.surface,
    borderColor: lightTheme.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[8],
    padding: spacing[16],
  },
  divider: { backgroundColor: lightTheme.border, height: 1 },
  financial: {
    ...typography.styles.financialMedium,
    color: lightTheme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[4],
    paddingBottom: spacing[12],
    paddingTop: spacing[8],
  },
  headerActions: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing[8],
    width: touchTargets.minimum * 3 + spacing[8] * 2,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[12] },
  globalAction: {
    alignItems: 'center',
    borderRadius: radius.medium,
    borderWidth: 1,
    height: touchTargets.minimum,
    justifyContent: 'center',
    width: touchTargets.minimum,
  },
  globalActionGlyph: { fontSize: 19, fontWeight: '600' },
  hubSection: { gap: spacing[8] },
  hubSectionBody: { gap: spacing[2] },
  hubSectionHeading: { gap: spacing[2] },
  featureEntry: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[12],
  },
  featureEntryCopy: { flex: 1, gap: spacing[2] },
  contextualAction: {
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[12],
  },
  profileMenu: { gap: spacing[2] },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  input: {
    borderColor: lightTheme.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    color: lightTheme.textPrimary,
    minHeight: touchTargets.minimum,
    padding: spacing[12],
  },
  row: {
    borderBottomColor: lightTheme.border,
    borderBottomWidth: 1,
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[8],
  },
  screen: {
    backgroundColor: lightTheme.background,
    flex: 1,
    gap: spacing[16],
    padding: spacing[16],
  },
  skeleton: {
    backgroundColor: lightTheme.surfaceSecondary,
    borderRadius: radius.small,
    height: 48,
  },
  state: { gap: spacing[8], paddingVertical: spacing[16] },
  touch: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.minimum,
    minWidth: touchTargets.minimum,
  },
});
export type { AtlasTheme };
export * from './focus-lifecycle';
export * from './navigation';
