import { createHash } from 'node:crypto';

import { createDatabase, generatedReports } from '@atlas/database';
import {
  ATLAS_JOB_NAMES,
  type ReportGenerationQueuePayload,
} from '@atlas/types';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';

import type { WorkerEnvironment } from '../config/environment';
import type { StructuredLogger } from '../observability/structured-logger';

export interface ReportComposition {
  process(job: Job<ReportGenerationQueuePayload>): Promise<unknown>;
  close(): Promise<void>;
}

export function createDefaultReportComposition(
  environment: WorkerEnvironment,
  logger: StructuredLogger,
): ReportComposition {
  const { db, pool } = createDatabase(environment.DATABASE_URL);
  return {
    async process(job) {
      if (job.name !== ATLAS_JOB_NAMES.reportGenerate)
        throw new UnrecoverableError('Unsupported report job type');
      const [report] = await db
        .select()
        .from(generatedReports)
        .where(
          and(
            eq(generatedReports.id, job.data.reportId),
            eq(generatedReports.ownerUserId, job.data.ownerUserId),
          ),
        )
        .limit(1);
      if (!report || report.deletedAt !== null)
        throw new UnrecoverableError('REPORT_NOT_FOUND');
      if (report.status === 'cancelled' || report.status === 'expired')
        throw new UnrecoverableError('REPORT_NOT_GENERATABLE');
      if (report.status === 'ready' && report.artifactPayload !== null)
        return { reportId: report.id, status: 'ready' };
      const [claimed] = await db
        .update(generatedReports)
        .set({ status: 'running', updatedAt: new Date() })
        .where(
          and(
            eq(generatedReports.id, report.id),
            eq(generatedReports.ownerUserId, job.data.ownerUserId),
            isNull(generatedReports.deletedAt),
            inArray(generatedReports.status, ['queued', 'running']),
          ),
        )
        .returning();
      if (!claimed) throw new UnrecoverableError('REPORT_NOT_GENERATABLE');
      const generatedAt = new Date();
      const format =
        claimed.sourceRevisions.format === 'json'
          ? 'json'
          : claimed.sourceRevisions.format === 'pdf'
            ? 'pdf'
            : 'csv';
      const artifact = createArtifact({
        dataCutoffAt: claimed.dataCutoffAt,
        format,
        generatedAt,
        reportType: claimed.reportType,
        sourceId: claimed.sourceId,
      });
      const checksum = createHash('sha256').update(artifact).digest('hex');
      const [persisted] = await db
        .update(generatedReports)
        .set({
          artifactPayload: artifact,
          byteSize: artifact.byteLength,
          contentType:
            format === 'pdf'
              ? 'application/pdf'
              : format === 'csv'
                ? 'text/csv; charset=utf-8'
                : 'application/json',
          generatedAt,
          status: 'ready',
          storageKey: `reports/${createHash('sha256').update(report.id).digest('hex')}.${format}`,
          sourceRevisions: {
            ...claimed.sourceRevisions,
            artifactChecksumSha256: checksum,
            workerContract: 'report-worker-v1',
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(generatedReports.id, report.id),
            eq(generatedReports.ownerUserId, job.data.ownerUserId),
            eq(generatedReports.status, 'running'),
          ),
        )
        .returning({ id: generatedReports.id });
      if (!persisted) throw new UnrecoverableError('REPORT_CANCELLED');
      logger.info('worker.report.persisted', {
        reportId: report.id,
        reportType: report.reportType,
      });
      return { reportId: report.id, status: 'ready' };
    },
    async close() {
      await pool.end();
    },
  };
}

function createArtifact(input: {
  reportType: string;
  sourceId: string | null;
  format: 'pdf' | 'csv' | 'json';
  dataCutoffAt: Date;
  generatedAt: Date;
}) {
  const record = {
    reportType: input.reportType,
    sourceId: input.sourceId ?? 'current-user',
    generatedAt: input.generatedAt.toISOString(),
    dataCutoffAt: input.dataCutoffAt.toISOString(),
    methodologyVersion: 'report-v1',
    sourceRevision: 'current',
    warnings: '',
    partialOrStale: false,
    notEvaluableReason: '',
  };
  if (input.format === 'json')
    return Buffer.from(JSON.stringify(record, null, 2));
  if (input.format === 'pdf') return createPdf(record);
  const keys = Object.keys(record);
  return Buffer.from(
    `${keys.map(csvCell).join(',')}\r\n${keys
      .map((key) => csvCell(String(record[key as keyof typeof record])))
      .join(',')}\r\n`,
  );
}

function createPdf(record: Readonly<Record<string, unknown>>): Buffer {
  const lines = [
    'Atlas Report',
    ...Object.entries(record).map(([key, value]) => `${key}: ${String(value)}`),
    'Methodology and disclosures are part of this generated artifact.',
    'Historical analysis is not investment advice.',
  ];
  const stream = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    ...lines.flatMap((line, index) => [
      index === 0 ? '' : '0 -18 Td',
      `(${pdfText(line)}) Tj`,
    ]),
    'ET',
  ]
    .filter(Boolean)
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body);
}

function pdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/gu, '')
    .replace(/[\\()]/gu, (character) => `\\${character}`)
    .slice(0, 180);
}

function csvCell(value: string) {
  const safe = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
