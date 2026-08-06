import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
  useMemo,
} from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View } from 'react-native';
import { createAtlasQueryClient } from '../query/query-client';
import { AuthProvider } from './auth-provider';

class FoundationErrorBoundary extends Component<
  PropsWithChildren,
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Production reporting is connected through the provider-neutral crash adapter in TASK-100J.
    void error;
    void info;
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <View accessibilityRole="alert">
          <Text>Atlas could not initialize safely.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function AppProviders({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => createAtlasQueryClient(), []);
  return (
    <FoundationErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </FoundationErrorBoundary>
  );
}
