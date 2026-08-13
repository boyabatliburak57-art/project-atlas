import { Redirect, useLocalSearchParams } from 'expo-router';

const allowedKeys = new Set([
  'fixture',
  'view',
  'offline',
  'resourceId',
  'runId',
]);

export function LegacyRouteAlias({ destination }: { destination: string }) {
  const input = useLocalSearchParams<Record<string, string | string[]>>();
  const params = Object.fromEntries(
    Object.entries(input).filter(
      (entry): entry is [string, string] =>
        allowedKeys.has(entry[0]) &&
        typeof entry[1] === 'string' &&
        entry[1].length <= 512,
    ),
  );
  return <Redirect href={{ pathname: destination as never, params }} />;
}
