import { Tabs, useGlobalSearchParams } from 'expo-router';
import { Text, useColorScheme, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '@atlas/design-tokens';
import {
  BottomNavigation,
  NavigationRail,
  navigationKind,
  type NavigationItem,
} from '@atlas/mobile-ui';
import { primaryNavigation } from '../../src/navigation/feature-registry';
import { tabBarBottomInset } from '../../src/navigation/safe-area-contract';

const labels: Record<string, string> = Object.fromEntries(
  primaryNavigation.map((item) => [item.routeName, item.label]),
);

interface TabRoute {
  readonly key: string;
  readonly name: string;
  readonly params?: object;
}
interface TabBarProps {
  readonly fixtureEnabled: boolean;
  readonly state: { readonly routes: TabRoute[]; readonly index: number };
  readonly descriptors: Record<
    string,
    { readonly options: { readonly href?: string | null } }
  >;
  readonly navigation: {
    emit(event: {
      readonly canPreventDefault?: boolean;
      readonly target: string;
      readonly type: string;
    }): { readonly defaultPrevented: boolean };
    navigate(name: string, params?: object): void;
  };
}
function AtlasTabBar({
  state,
  descriptors,
  fixtureEnabled,
  navigation,
}: TabBarProps) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => labels[route.name]);
  const items: NavigationItem[] = routes.map((route) => ({
    icon: (
      <Text accessibilityElementsHidden style={{ color: theme.textSecondary }}>
        {labels[route.name]?.slice(0, 1)}
      </Text>
    ),
    key: route.key,
    label: labels[route.name] ?? route.name,
    testID: `tab-${route.name}`,
    visible: descriptors[route.key]?.options.href !== null,
  }));
  const activeKey = state.routes[state.index]?.key ?? routes[0]?.key ?? '';
  const select = (key: string, reselected: boolean) => {
    const route = routes.find((candidate) => candidate.key === key);
    if (!route) return;
    const event = navigation.emit({
      canPreventDefault: true,
      target: route.key,
      type: 'tabPress',
    });
    if (!event.defaultPrevented)
      navigation.navigate(route.name, {
        ...route.params,
        ...(fixtureEnabled ? { fixture: '1' } : {}),
      });
    if (reselected)
      navigation.emit({ target: route.key, type: 'tabLongPress' });
  };
  const kind = navigationKind(width);
  return kind === 'bottom' ? (
    <BottomNavigation
      activeKey={activeKey}
      items={items}
      onSelect={select}
      safeAreaBottom={tabBarBottomInset(insets.bottom)}
      theme={theme}
    />
  ) : (
    <NavigationRail
      activeKey={activeKey}
      expanded={kind === 'rail-expanded'}
      items={items}
      onSelect={select}
      theme={theme}
    />
  );
}

export default function TabsLayout() {
  const parameters = useGlobalSearchParams<{ fixture?: string }>();
  const fixtureEnabled = __DEV__ && parameters.fixture === '1';
  const { width } = useWindowDimensions();
  const kind = navigationKind(width);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle:
          kind === 'bottom'
            ? undefined
            : { marginLeft: kind === 'rail-expanded' ? 240 : 72 },
      }}
      tabBar={(props) => (
        <AtlasTabBar
          {...(props as unknown as Omit<TabBarProps, 'fixtureEnabled'>)}
          fixtureEnabled={fixtureEnabled}
        />
      )}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="markets" options={{ title: 'Markets' }} />
      <Tabs.Screen name="radar" options={{ title: 'Radar' }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="research" options={{ title: 'Research' }} />
    </Tabs>
  );
}
