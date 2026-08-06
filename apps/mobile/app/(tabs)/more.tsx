import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Card, ScrollScreen } from '@atlas/mobile-ui';
import { spacing, touchTargets } from '@atlas/design-tokens';

export default function MoreRoute() {
  return (
    <ScrollScreen>
      <AppHeader title="More" subtitle="Araçlar ve tercihler" />
      <View style={styles.list}>
        <MoreLink href="/scanner" label="Scanner" />
        <MoreLink href="/watchlists" label="İzleme listeleri ve alarmlar" />
        <MoreLink
          href="/notifications?fixture=1&view=notifications"
          label="Bildirim merkezi"
        />
        <MoreLink href="/preferences" label="Temel tercihler" />
      </View>
      <Card>
        <Text>
          Portfolio, Strategy Lab, Reports ve Settings merkezi sonraki
          görevlerdedir.
        </Text>
      </Card>
    </ScrollScreen>
  );
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityRole="button" style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text>›</Text>
      </Pressable>
    </Link>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 17, fontWeight: '700' },
  list: { gap: spacing[8] },
  row: {
    alignItems: 'center',
    borderBottomColor: '#DCE4EF',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: touchTargets.minimum,
    paddingVertical: spacing[12],
  },
});
