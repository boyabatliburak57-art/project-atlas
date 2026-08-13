# Atlas Mobile Safe-Area Contract

## Ownership

- `SafeAreaProvider` is mounted once by `AppProviders`; it supplies measurements and does not add
  visual padding.
- `SafeAreaScrollScreen` owns the top inset for headerless stack and tab screens.
- Outside the tab navigator, `SafeAreaScrollScreen` also owns the bottom inset.
- Inside the tab navigator, the custom `BottomNavigation` owns the bottom system inset. The scene
  receives only the standard content spacing because Expo Router lays it above the measured tab
  bar.
- `AppHeader` never adds a system inset. It owns only component-internal spacing, background,
  border and semantic foreground colors.
- Modal and sheet roots use the same provider measurements and explicitly consume their exposed
  top/bottom edges; keyboard-aware content must not replace those insets with device constants.

## Prohibited combinations

- Root or tab layout top padding plus `SafeAreaScrollScreen` top padding.
- `AppHeader` status-bar padding.
- Screen bottom padding that guesses the tab-bar or home-indicator height.
- Device-specific values such as 44/47-point status-bar offsets.
- Screenshot masks over the status bar, header, tab bar or Scanner content.

## Scroll behavior

Scrollable screens use a deterministic design-token content gap and bottom spacing. The last
interactive element remains reachable because tab scenes end above the inset-aware tab bar and
non-tab screens consume the bottom safe-area edge. Scroll position is reset explicitly by visual
evidence flows before capture; persisted tab state remains a product behavior, not a layout fix.
