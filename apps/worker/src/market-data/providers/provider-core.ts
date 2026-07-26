import { ProviderContractError } from './errors';
import { parseProviderCode } from './schemas';

export const PROVIDER_CAPABILITY_NAMES = [
  'instruments',
  'ohlcv',
  'tradingCalendar',
  'marketSessions',
  'indexMembership',
  'sectorMembership',
  'benchmarks',
  'fundamentals',
  'corporateActions',
] as const;

export type ProviderCapability = (typeof PROVIDER_CAPABILITY_NAMES)[number];

export interface ProviderCapabilities {
  readonly supported: readonly ProviderCapability[];
}

export interface ProviderCredentialReference {
  readonly store: 'environment' | 'secretStore';
  readonly reference: string;
  readonly version?: string | undefined;
}

export interface ProviderConnection {
  readonly providerCode: string;
  readonly environment: 'sandbox' | 'production';
  readonly credential: ProviderCredentialReference;
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface ProviderHealth {
  readonly status: ProviderHealthStatus;
  readonly checkedAt: Date;
  readonly reason:
    | 'none'
    | 'authentication'
    | 'rateLimit'
    | 'latency'
    | 'network'
    | 'providerOutage';
}

export interface ProviderRateLimitState {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly resetAt: Date | null;
  readonly retryAfterMs: number | null;
}

export interface ProviderDataRevision {
  readonly revision: string;
  readonly revisedAt: Date;
  readonly supersedesRevision: string | null;
}

export interface ProviderSourceTimestamp {
  readonly sourceTimestamp: Date;
}

export interface ProviderAvailableAt {
  readonly availableAt: Date;
}

export type ProviderRedistributionPolicy =
  | 'internalOnly'
  | 'derivedDataOnly'
  | 'attributionRequired'
  | 'redistributionAllowed';

export interface ProviderLicenseMetadata {
  readonly licenseId: string;
  readonly attribution: string | null;
  readonly redistribution: ProviderRedistributionPolicy;
}

export interface ProviderFallbackPolicy {
  readonly orderedProviderCodes?: readonly string[] | undefined;
  readonly retryOn: readonly import('./errors').ProviderErrorTaxonomy[];
  readonly allowDegraded: boolean;
}

export interface ProviderLineage
  extends ProviderDataRevision, ProviderSourceTimestamp, ProviderAvailableAt {
  readonly providerCode: string;
  readonly license: ProviderLicenseMetadata;
}

export interface ProviderRegistration {
  readonly code: string;
  readonly priority: number;
  readonly connection: ProviderConnection;
  readonly capabilities: ProviderCapabilities;
  readonly license: ProviderLicenseMetadata;
  readonly health: () => Promise<ProviderHealth>;
}

export interface ProviderSelection {
  readonly code: string;
  readonly connection: ProviderConnection;
  readonly license: ProviderLicenseMetadata;
}

/**
 * Provider-wide registry. It stores credential references, never credential
 * values, and orders equal-priority providers by stable provider code.
 */
export class ProviderContractRegistry {
  private readonly registrations = new Map<string, ProviderRegistration>();

  register(registration: ProviderRegistration): void {
    const code = parseProviderCode(registration.code);
    if (registration.connection.providerCode !== code) {
      throw new ProviderContractError('invalidPayload', { providerCode: code });
    }
    if (this.registrations.has(code)) {
      throw new ProviderContractError('permanentFailure', {
        providerCode: code,
      });
    }
    this.registrations.set(code, {
      ...registration,
      code,
      capabilities: {
        supported: normalizeCapabilities(registration.capabilities.supported),
      },
    });
  }

  discover(code: string): ProviderCapabilities {
    return this.requireRegistration(code).capabilities;
  }

  supports(code: string, capability: ProviderCapability): boolean {
    return this.discover(code).supported.includes(capability);
  }

  async select(
    capability: ProviderCapability,
    policy: ProviderFallbackPolicy,
    excludedCodes: ReadonlySet<string> = new Set(),
  ): Promise<ProviderSelection> {
    const order = new Map(
      (policy.orderedProviderCodes ?? []).map((code, index) => [code, index]),
    );
    const candidates = [...this.registrations.values()]
      .filter(
        (registration) =>
          !excludedCodes.has(registration.code) &&
          registration.capabilities.supported.includes(capability),
      )
      .sort(
        (left, right) =>
          (order.get(left.code) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(right.code) ?? Number.MAX_SAFE_INTEGER) ||
          left.priority - right.priority ||
          left.code.localeCompare(right.code),
      );

    for (const candidate of candidates) {
      const health = await candidate.health();
      if (
        health.status === 'healthy' ||
        (health.status === 'degraded' && policy.allowDegraded)
      ) {
        return {
          code: candidate.code,
          connection: candidate.connection,
          license: candidate.license,
        };
      }
    }

    throw new ProviderContractError('unsupportedCapability', { capability });
  }

  listCodes(): readonly string[] {
    return [...this.registrations.keys()].sort();
  }

  private requireRegistration(code: string): ProviderRegistration {
    let normalizedCode: string;
    try {
      normalizedCode = parseProviderCode(code);
    } catch {
      throw new ProviderContractError('notFound');
    }
    const registration = this.registrations.get(normalizedCode);
    if (!registration) {
      throw new ProviderContractError('notFound', {
        providerCode: normalizedCode,
      });
    }
    return registration;
  }
}

export async function executeWithProviderFallback<Value>(
  registry: ProviderContractRegistry,
  capability: ProviderCapability,
  policy: ProviderFallbackPolicy,
  operation: (selection: ProviderSelection) => Promise<Value>,
): Promise<{ readonly value: Value; readonly providerCode: string }> {
  const attempted = new Set<string>();

  while (true) {
    const selected = await registry.select(capability, policy, attempted);
    attempted.add(selected.code);
    try {
      return {
        value: await operation(selected),
        providerCode: selected.code,
      };
    } catch (error: unknown) {
      if (
        !(error instanceof ProviderContractError) ||
        !policy.retryOn.includes(error.taxonomy)
      ) {
        throw error;
      }
    }
  }
}

export function redactProviderConnection(
  connection: ProviderConnection,
): Readonly<Omit<ProviderConnection, 'credential'> & { credential: string }> {
  return {
    providerCode: connection.providerCode,
    environment: connection.environment,
    credential: '[REDACTED]',
  };
}

export function providerMetricLabels(input: {
  readonly providerCode: string;
  readonly capability: ProviderCapability;
  readonly outcome: 'success' | 'error';
}): Readonly<Record<'provider' | 'capability' | 'outcome', string>> {
  return {
    provider: parseProviderCode(input.providerCode),
    capability: input.capability,
    outcome: input.outcome,
  };
}

function normalizeCapabilities(
  capabilities: readonly ProviderCapability[],
): readonly ProviderCapability[] {
  return [...new Set(capabilities)].sort(
    (left, right) =>
      PROVIDER_CAPABILITY_NAMES.indexOf(left) -
      PROVIDER_CAPABILITY_NAMES.indexOf(right),
  );
}
