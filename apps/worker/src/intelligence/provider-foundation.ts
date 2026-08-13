import type {
  IntelligenceCapability,
  ProductAvailability,
  ProviderHealthState,
} from '@atlas/domain';

export interface CapabilityAdapterRegistration {
  readonly providerId: string;
  readonly capability: IntelligenceCapability;
  readonly availability: ProductAvailability;
  readonly health: () => Promise<ProviderHealthState>;
  readonly credentialReference: string | null;
  readonly adapter: object | null;
}

/** Capability-specific composition registry. It never stores credential values
 * and intentionally does not register empty workers or fixture fallbacks. */
export class IntelligenceProviderRegistry {
  private readonly registrations = new Map<
    string,
    CapabilityAdapterRegistration
  >();

  register(registration: CapabilityAdapterRegistration): void {
    const key = `${registration.providerId}:${registration.capability}`;
    if (this.registrations.has(key))
      throw new Error('DUPLICATE_PROVIDER_CAPABILITY');
    if (
      registration.availability.startsWith('SUPPORTED_') &&
      (!registration.adapter || !registration.credentialReference)
    )
      throw new Error('EXTERNAL_CONFIGURATION_REQUIRED');
    this.registrations.set(key, registration);
  }

  resolve(
    providerId: string,
    capability: IntelligenceCapability,
  ): CapabilityAdapterRegistration {
    const registration = this.registrations.get(`${providerId}:${capability}`);
    if (!registration) throw new Error('CAPABILITY_UNAVAILABLE');
    return registration;
  }

  list(): readonly Omit<
    CapabilityAdapterRegistration,
    'credentialReference' | 'adapter'
  >[] {
    return [...this.registrations.values()].map(
      ({ providerId, capability, availability, health }) => ({
        providerId,
        capability,
        availability,
        health,
      }),
    );
  }
}

export const INTELLIGENCE_INGESTION_COMPOSITION_POINT =
  'apps/worker/src/intelligence' as const;

export function intelligenceMetricLabels(input: {
  readonly providerId: string;
  readonly capability: IntelligenceCapability;
  readonly outcome: 'success' | 'rejected' | 'error';
}): Readonly<Record<string, string>> {
  return {
    provider: input.providerId,
    capability: input.capability,
    outcome: input.outcome,
  };
}
