export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';
const values = new Map<string, string>();

export function getItemAsync(key: string): Promise<string | null> {
  return Promise.resolve(values.get(key) ?? null);
}

export function setItemAsync(key: string, value: string): Promise<void> {
  values.set(key, value);
  return Promise.resolve();
}

export function deleteItemAsync(key: string): Promise<void> {
  values.delete(key);
  return Promise.resolve();
}
