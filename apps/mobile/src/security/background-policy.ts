export const BACKGROUND_REFRESH_STATUS = 'NOT_REQUIRED_FOR_V1' as const;
export const CLIENT_BACKGROUND_FINANCIAL_EVALUATION = 'PROHIBITED' as const;

const forbiddenJobs = new Set([
  'scannerExecution',
  'alertEvaluation',
  'portfolioRisk',
  'backtestExecution',
  'providerPolling',
]);

export function assertBackgroundTaskAllowed(task: string): void {
  if (forbiddenJobs.has(task))
    throw new Error('BACKGROUND_FINANCIAL_TASK_PROHIBITED');
  if (task !== 'notificationHandling' && task !== 'sensitiveFileCleanup')
    throw new Error('BACKGROUND_TASK_NOT_ALLOWLISTED');
}
