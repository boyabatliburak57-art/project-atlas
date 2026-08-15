import type { PropsWithChildren, RefObject } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAtlasTheme } from '@atlas/mobile-ui';
import {
  screenContentBottomSpacing,
  screenSafeAreaEdges,
} from '../navigation/safe-area-contract';

export function SafeAreaScrollScreen({
  children,
  contentContainerStyle,
  scrollViewRef,
  testID,
}: PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewRef?: RefObject<ScrollView | null>;
  testID?: string;
}>) {
  const segments = useSegments() as string[];
  const theme = useAtlasTheme();
  return (
    <SafeAreaView
      edges={[...screenSafeAreaEdges(segments)]}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <ScrollView
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={[
          contentContainerStyle,
          { paddingBottom: screenContentBottomSpacing() },
        ]}
        keyboardShouldPersistTaps="handled"
        ref={scrollViewRef}
        testID={testID}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SafeAreaScreen({
  children,
  style,
  testID,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const segments = useSegments() as string[];
  const theme = useAtlasTheme();
  return (
    <SafeAreaView
      edges={[...screenSafeAreaEdges(segments)]}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={style} testID={testID}>
        {children}
      </View>
    </SafeAreaView>
  );
}
