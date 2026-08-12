import type { AtlasApiClient, AtlasResponse } from '@atlas/api-client';

export interface MobileReportSummary {
  readonly id: string;
  readonly reportType: string;
  readonly status:
    | 'queued'
    | 'running'
    | 'ready'
    | 'failed'
    | 'cancelled'
    | 'expired';
  readonly dataCutoffAt: string;
  readonly generatedAt: string | null;
  readonly expiresAt: string;
  readonly contentType: string | null;
}

export interface MobileSupportRequest {
  readonly id: string;
  readonly type: string;
  readonly subject: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class ReportsSettingsApi {
  constructor(private readonly client: AtlasApiClient) {}

  listReports(cursor?: string, signal?: AbortSignal) {
    return this.client.request<
      AtlasResponse<{
        items: readonly MobileReportSummary[];
        nextCursor: string | null;
      }>
    >({
      path: '/reports',
      query: { cursor, limit: 20 },
      ...(signal === undefined ? {} : { signal }),
    });
  }

  createReport(
    input: {
      reportType: string;
      sourceId?: string;
      format: 'pdf' | 'csv';
      idempotencyKey: string;
    },
    signal?: AbortSignal,
  ) {
    return this.client.request<AtlasResponse<MobileReportSummary>>({
      path: '/reports',
      method: 'POST',
      body: input,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  getReport(id: string, signal?: AbortSignal) {
    return this.client.request<AtlasResponse<MobileReportSummary>>({
      path: `/reports/${encodeURIComponent(id)}`,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  getReportDownloadContract(id: string, signal?: AbortSignal) {
    return this.client.request<
      AtlasResponse<{
        downloadUrl: string;
        expiresAt: string;
        filename: string;
      }>
    >({
      path: `/reports/${encodeURIComponent(id)}/download`,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  createSupportRequest(input: unknown, signal?: AbortSignal) {
    return this.client.request<AtlasResponse<MobileSupportRequest>>({
      path: '/support/requests',
      method: 'POST',
      body: input,
      ...(signal === undefined ? {} : { signal }),
    });
  }

  listSupportRequests(cursor?: string, signal?: AbortSignal) {
    return this.client.request<
      AtlasResponse<{
        items: readonly MobileSupportRequest[];
        nextCursor: string | null;
      }>
    >({
      path: '/support/requests',
      query: { cursor, limit: 20 },
      ...(signal === undefined ? {} : { signal }),
    });
  }

  updatePreferences(
    body: Readonly<Record<string, unknown>> & { expectedVersion: number },
    signal?: AbortSignal,
  ) {
    return this.client.request<AtlasResponse<Record<string, unknown>>>({
      path: '/me/preferences',
      method: 'PATCH',
      body,
      ...(signal === undefined ? {} : { signal }),
    });
  }
}
