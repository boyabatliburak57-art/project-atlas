import type { AlertMetrics } from './contracts';

export class InMemoryAlertMetrics implements AlertMetrics {
  readonly counters = new Map<string, number>();
  readonly observations = new Map<string, number[]>();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  observe(name: string, value: number): void {
    const values = this.observations.get(name) ?? [];
    values.push(value);
    this.observations.set(name, values);
  }
}
