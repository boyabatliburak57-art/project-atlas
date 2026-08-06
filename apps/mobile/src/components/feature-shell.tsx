import {
  AppHeader,
  DemoBadge,
  EmptyState,
  ProviderRequiredState,
  Screen,
} from '@atlas/mobile-ui';
export function FeatureShell({
  title,
  targetTask,
  state = 'empty',
}: {
  title: string;
  targetTask: string;
  state?: 'empty' | 'provider';
}) {
  return (
    <Screen>
      <AppHeader
        title={title}
        subtitle={`UI shell · ${targetTask} · NOT_IMPLEMENTED`}
      />
      <DemoBadge />
      {state === 'provider' ? <ProviderRequiredState /> : <EmptyState />}
    </Screen>
  );
}
