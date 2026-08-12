import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppLifecycleController } from '../services/app-lifecycle';
import { connectAppLifecycle } from '../services/app-lifecycle-connector';
import { ScreenCaptureMitigation } from '../security/screen-capture';

export function AppPrivacyBoundary({ children }: PropsWithChildren) {
  const lifecycle = useMemo(() => new AppLifecycleController(), []);
  const capture = useMemo(() => new ScreenCaptureMitigation(), []);
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const disconnectLifecycle = connectAppLifecycle(lifecycle);
    const disconnectState = lifecycle.onStateChange((state) => {
      setCovered(state !== 'active');
    });
    void capture.start(() => undefined);
    return () => {
      disconnectState();
      disconnectLifecycle();
      void capture.stop();
    };
  }, [capture, lifecycle]);

  return (
    <View style={styles.root}>
      <View
        accessibilityElementsHidden={covered}
        importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
        style={styles.content}
      >
        {children}
      </View>
      {covered ? (
        <View
          accessibilityLabel="Atlas gizlilik örtüsü. Hassas içerik gizlendi."
          accessibilityRole="summary"
          accessibilityViewIsModal
          style={styles.cover}
          testID="app-privacy-cover"
        >
          <Text style={styles.mark}>ATLAS</Text>
          <Text style={styles.message}>Hassas içerik gizlendi</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  root: { flex: 1 },
  cover: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    alignItems: 'center',
    backgroundColor: '#07111F',
    justifyContent: 'center',
    zIndex: 10_000,
  },
  mark: { color: '#F1F5F9', fontSize: 32, fontWeight: '800', letterSpacing: 8 },
  message: { color: '#94A3B8', fontSize: 15, marginTop: 16 },
});
