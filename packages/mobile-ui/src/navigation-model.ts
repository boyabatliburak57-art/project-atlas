export interface NavigationVisibility {
  readonly visible?: boolean;
}
export function formatNavigationBadge(value?: number): string | undefined {
  if (value === undefined || value <= 0) return undefined;
  return value > 99 ? '99+' : String(value);
}
export function formatNavigationAccessibilityLabel(
  label: string,
  badge?: number,
): string {
  const formattedBadge = formatNavigationBadge(badge);
  return `${label}${formattedBadge ? `, ${formattedBadge} bildirim` : ''}`;
}
export function visibleNavigationItems<T extends NavigationVisibility>(
  items: readonly T[],
): T[] {
  return items.filter((item) => item.visible !== false);
}
export function navigationKind(
  width: number,
): 'bottom' | 'rail-compact' | 'rail-expanded' {
  if (width < 768) return 'bottom';
  return width < 1024 ? 'rail-compact' : 'rail-expanded';
}
