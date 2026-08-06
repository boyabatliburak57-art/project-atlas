import { Tabs } from 'expo-router';
import { Text, useColorScheme, useWindowDimensions } from 'react-native';
import { darkTheme, lightTheme } from '@atlas/design-tokens';
import {
  BottomNavigation,
  NavigationRail,
  navigationKind,
  type NavigationItem,
} from '@atlas/mobile-ui';

const labels: Record<string, string> = {
  home: 'Home',
  markets: 'Markets',
  search: 'Search',
  portfolio: 'Portfolio',
  more: 'More',
};

interface TabRoute {
  readonly key: string;
  readonly name: string;
  readonly params?: object;
}
interface TabBarProps {
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
function AtlasTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const routes = state.routes.filter((route) => labels[route.name]);
  const items: NavigationItem[] = routes.map((route) => ({
    icon: (
      <Text accessibilityElementsHidden>{labels[route.name]?.slice(0, 1)}</Text>
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
    if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
    if (reselected)
      navigation.emit({ target: route.key, type: 'tabLongPress' });
  };
  const kind = navigationKind(width);
  return kind === 'bottom' ? (
    <BottomNavigation
      activeKey={activeKey}
      items={items}
      onSelect={select}
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
      tabBar={(props) => <AtlasTabBar {...(props as unknown as TabBarProps)} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="markets" options={{ title: 'Markets' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
