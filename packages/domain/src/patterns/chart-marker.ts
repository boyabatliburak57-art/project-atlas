import type { PatternDetection } from './contracts.js';

export function patternToChartMarkers(pattern: PatternDetection) {
  return pattern.evidencePoints.map((point, index) => ({
    id: `${pattern.deduplicationKey}:${index}`,
    time: point.time,
    price: point.price,
    role: point.role,
    label: `${pattern.patternCode}:${pattern.state}`,
    state: pattern.state,
    direction: pattern.direction,
    algorithmVersion: pattern.algorithmVersion,
    evidenceVersion: 1,
  }));
}
