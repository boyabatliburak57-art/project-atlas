import type {
  NotificationPreferenceResolver,
  NotificationStore,
  NotificationWriteResult,
} from './contracts';
import { resolveEmailAvailableAt } from './quiet-hours';

export class NotificationOrchestrator {
  constructor(
    private readonly dependencies: {
      readonly store: NotificationStore;
      readonly preferences: NotificationPreferenceResolver;
      readonly now?: (() => Date) | undefined;
    },
  ) {}

  async orchestrateTriggerIds(
    triggerIds: readonly string[],
  ): Promise<readonly NotificationWriteResult[]> {
    const results: NotificationWriteResult[] = [];
    for (const triggerId of [...new Set(triggerIds)]) {
      const context =
        await this.dependencies.store.loadTriggerContext(triggerId);
      if (context === null) continue;
      const preference = await this.dependencies.preferences.resolve(
        context.userId,
      );
      const now = this.dependencies.now?.() ?? new Date();
      results.push(
        await this.dependencies.store.writeTriggerNotification({
          context,
          preference,
          emailAvailableAt: resolveEmailAvailableAt(now, preference),
          now,
        }),
      );
    }
    return results;
  }
}
