import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AtlasApiClient } from '@atlas/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { currentMobileEnvironment } from '../config/environment';
import { MobileAuthApi } from '../features/auth/auth-api';
import {
  AuthSessionController,
  type AuthState,
} from '../features/auth/auth-session';
import { clearPrivateQueries } from '../query/query-client';
import { ExpoSecureStorage } from '../storage/secure-storage';

interface AuthContextValue {
  readonly state: AuthState;
  login(email: string, password: string): Promise<boolean>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(token: string, password: string): Promise<void>;
  verificationStatus(): ReturnType<MobileAuthApi['verificationStatus']>;
  resendVerification(): ReturnType<MobileAuthApi['resendVerification']>;
  confirmVerification(token: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const composition = useMemo(() => {
    const controller = new AuthSessionController(new ExpoSecureStorage(), () =>
      clearPrivateQueries(queryClient),
    );
    const environment = currentMobileEnvironment();
    const client = new AtlasApiClient({
      baseUrl: environment.EXPO_PUBLIC_API_BASE_URL,
      context: () => ({
        appVersion: '0.1.0',
        locale: 'tr-TR',
        platform: 'ios',
        timezone: 'Europe/Istanbul',
      }),
      credentials: controller,
    });
    return { api: new MobileAuthApi(client), controller };
  }, [queryClient]);
  const [state, setState] = useState<AuthState>(
    composition.controller.snapshot(),
  );
  useEffect(() => {
    const unsubscribe = composition.controller.subscribe(setState);
    void composition.controller.restore();
    return unsubscribe;
  }, [composition]);
  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      async login(email, password) {
        const session = await composition.api.login(email, password);
        await composition.controller.establish(session);
        return session.emailVerificationRequired === true;
      },
      async logout() {
        try {
          await composition.api.logout();
        } finally {
          await composition.controller.logout();
        }
      },
      async requestPasswordReset(email) {
        await composition.api.requestPasswordReset(email);
      },
      confirmPasswordReset: (token, password) =>
        composition.api.confirmPasswordReset(token, password),
      verificationStatus: () => composition.api.verificationStatus(),
      resendVerification: () => composition.api.resendVerification(),
      async confirmVerification(token) {
        await composition.api.confirmVerification(token);
        const current = composition.controller.snapshot();
        if (current.status === 'verificationRequired')
          await composition.controller.establish({
            ...current.session,
            emailVerificationRequired: false,
          });
      },
    }),
    [composition, state],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('AuthProvider is required');
  return value;
}
