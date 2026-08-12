import {
  CryptoDigestAlgorithm,
  digest,
  getRandomBytesAsync,
} from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import {
  ALLOWED_REPORT_TYPES,
  MAX_SENSITIVE_REPORT_BYTES,
  TEMP_FILE_TTL_MS,
  type ReportDownloadDescriptor,
  type ValidatedReportFile,
  validateDownloadDescriptor,
  validateDownloadedMetadata,
} from './file-policy';

export * from './file-policy';

export class NativeReportFileManager {
  private readonly root = new Directory(Paths.cache, 'atlas-sensitive-reports');
  private readonly files = new Map<string, ValidatedReportFile>();

  async download(
    descriptor: ReportDownloadDescriptor,
    authenticatedFetch: typeof fetch,
    now = Date.now(),
  ): Promise<ValidatedReportFile> {
    validateDownloadDescriptor(descriptor, now);
    this.ensureRoot();
    const extension = ALLOWED_REPORT_TYPES.get(descriptor.mimeType)!;
    const destination = new File(
      this.root,
      `${await randomName()}${extension}`,
    );
    try {
      const response = await authenticatedFetch(descriptor.url, {
        method: 'GET',
        redirect: 'error',
      });
      if (!response.ok) throw new Error('DOWNLOAD_VALIDATION_FAILED');
      const declaredSize = Number(
        response.headers.get('content-length') ?? '0',
      );
      if (declaredSize > MAX_SENSITIVE_REPORT_BYTES)
        throw new Error('DOWNLOAD_VALIDATION_FAILED');
      const bytes = new Uint8Array(await response.arrayBuffer());
      validateDownloadedMetadata({
        expectedMime: descriptor.mimeType,
        actualMime: response.headers.get('content-type'),
        size: bytes.byteLength,
        extension,
      });
      destination.create({ overwrite: false });
      destination.write(bytes);
      const checksum = toHex(
        new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, bytes)),
      );
      if (
        descriptor.expectedChecksum &&
        checksum.toLowerCase() !== descriptor.expectedChecksum.toLowerCase()
      )
        throw new Error('DOWNLOAD_VALIDATION_FAILED');
      const file: ValidatedReportFile = {
        ownerId: descriptor.ownerId,
        uri: destination.uri,
        mimeType: descriptor.mimeType,
        size: bytes.byteLength,
        checksum,
        expiresAt: Math.min(descriptor.expiresAt, now + TEMP_FILE_TTL_MS),
      };
      this.files.set(destination.uri, file);
      return file;
    } catch (error) {
      if (destination.exists) destination.delete();
      throw error;
    }
  }

  assertShareable(
    file: ValidatedReportFile,
    ownerId: string,
    now = Date.now(),
  ): void {
    const tracked = this.files.get(file.uri);
    if (!tracked || tracked.ownerId !== ownerId || tracked.expiresAt <= now)
      throw new Error('REPORT_SHARE_NOT_AUTHORIZED');
    const local = new File(file.uri);
    if (!local.exists || local.size !== tracked.size)
      throw new Error('DOWNLOAD_VALIDATION_FAILED');
  }

  cleanupOwner(ownerId: string): void {
    for (const [uri, metadata] of this.files) {
      if (metadata.ownerId === ownerId) this.deleteTracked(uri);
    }
  }

  cleanupExpired(now = Date.now()): void {
    for (const [uri, metadata] of this.files) {
      if (metadata.expiresAt <= now) this.deleteTracked(uri);
    }
  }

  cleanupAll(): void {
    for (const uri of [...this.files.keys()]) this.deleteTracked(uri);
    if (this.root.exists) this.root.delete();
  }

  private ensureRoot(): void {
    if (!this.root.exists)
      this.root.create({ idempotent: true, intermediates: true });
  }
  private deleteTracked(uri: string): void {
    const file = new File(uri);
    if (file.exists) file.delete();
    this.files.delete(uri);
  }
}

export const nativeReportFileManager = new NativeReportFileManager();

async function randomName(): Promise<string> {
  const bytes = await getRandomBytesAsync(16);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
