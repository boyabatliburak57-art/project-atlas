import * as Linking from 'expo-linking';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';

export interface BiometricFoundation {
  isAvailable(): Promise<boolean>;
}

export interface LinkingFoundation {
  initialUrl(): Promise<string | null>;
  subscribe(listener: (url: string) => void): () => void;
}

export interface NotificationPermissionFoundation {
  status(): Promise<'denied' | 'granted' | 'undetermined'>;
}

export const biometricFoundation: BiometricFoundation = {
  async isAvailable() {
    return (
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync())
    );
  },
};

export const linkingFoundation: LinkingFoundation = {
  initialUrl: () => Linking.getInitialURL(),
  subscribe(listener) {
    const subscription = Linking.addEventListener('url', ({ url }) =>
      listener(url),
    );
    return () => subscription.remove();
  },
};

export const notificationPermissionFoundation: NotificationPermissionFoundation =
  {
    async status() {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status === Notifications.PermissionStatus.GRANTED)
        return 'granted';
      if (permission.status === Notifications.PermissionStatus.DENIED)
        return 'denied';
      return 'undetermined';
    },
  };
