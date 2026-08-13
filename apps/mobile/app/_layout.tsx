import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/providers/app-providers';
import { ThemeProvider } from '@atlas/mobile-ui';
import { darkTheme, lightTheme } from '@atlas/design-tokens';
import { LogBox, useColorScheme } from 'react-native';
import { AppRouteGuard } from '../src/navigation/app-route-guard';

if (__DEV__ && process.env['EXPO_PUBLIC_E2E_MODE'] === 'true') {
  LogBox.ignoreAllLogs();
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AppProviders>
      <ThemeProvider theme={colorScheme === 'dark' ? darkTheme : lightTheme}>
        <AppRouteGuard>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </AppRouteGuard>
      </ThemeProvider>
    </AppProviders>
  );
}
