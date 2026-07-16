import type { StructuredLogger } from '../observability/structured-logger';
import type {
  AlertEvaluationEvent,
  AlertEvaluationRepository,
  AlertMetrics,
  AlertSourceEvaluator,
  AlertTriggerSink,
} from './contracts';

export class AlertEvaluationProcessor {
  constructor(
    private readonly dependencies: {
      readonly repository: AlertEvaluationRepository;
      readonly evaluator: AlertSourceEvaluator;
      readonly metrics: AlertMetrics;
      readonly logger: StructuredLogger;
      readonly triggerSink?: AlertTriggerSink | undefined;
      readonly now?: (() => Date) | undefined;
    },
  ) {}

  async process(event: AlertEvaluationEvent): Promise<{
    readonly candidateCount: number;
    readonly triggerCount: number;
    readonly duplicateCount: number;
  }> {
    const startedAt = Date.now();
    const candidates = await this.dependencies.repository.findCandidates(event);
    let triggerCount = 0;
    let duplicateCount = 0;
    for (const candidate of candidates) {
      const evaluationStartedAt = Date.now();
      const evaluation = await this.dependencies.evaluator.evaluate(
        candidate,
        event,
      );
      const evaluatedAt = this.dependencies.now?.() ?? new Date();
      const persisted = await this.dependencies.repository.persistEvaluation({
        candidate,
        event,
        evaluation,
        evaluatedAt,
        durationMs: Math.max(0, Date.now() - evaluationStartedAt),
      });
      triggerCount += persisted.triggerCount;
      duplicateCount += persisted.duplicate ? 1 : 0;
      this.dependencies.metrics.increment('alert.evaluation.count', 1, {
        status: evaluation.status,
      });
      if (evaluation.status === 'not_evaluable') {
        this.dependencies.metrics.increment('alert.evaluation.not_evaluable');
      }
      if (persisted.triggerIds.length > 0) {
        await this.dependencies.triggerSink?.handle(persisted.triggerIds);
      }
    }
    this.dependencies.metrics.increment('alert.trigger.count', triggerCount);
    this.dependencies.metrics.increment(
      'alert.evaluation.dedup',
      duplicateCount,
    );
    this.dependencies.metrics.observe(
      'alert.evaluation.duration_ms',
      Math.max(0, Date.now() - startedAt),
    );
    this.dependencies.logger.info('worker.alert.evaluation.completed', {
      candidateCount: candidates.length,
      duplicateCount,
      eventId: event.eventId,
      eventType: event.type,
      triggerCount,
    });
    return { candidateCount: candidates.length, triggerCount, duplicateCount };
  }
}
