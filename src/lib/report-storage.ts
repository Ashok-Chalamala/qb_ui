import type { MedicalReport } from "./qb-data";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

// ── Storage abstraction ───────────────────────────────────────────────────────

/**
 * ReportStorageService — thin storage abstraction layer.
 *
 * Current implementation: in-browser object URLs (mock / local).
 *
 * Future: replace the three core methods below with cloud calls:
 *   upload()     → POST to AWS S3 / Azure Blob / GCS pre-signed URL
 *   download()   → fetch signed GET URL then trigger anchor download
 *   deleteFile() → DELETE API call + revoke local blob URL if applicable
 */
export class ReportStorageService {
  /**
   * Upload a File and return a local object URL for immediate preview/download.
   * Swap this body for a multipart POST to your storage backend.
   */
  async upload(file: File): Promise<UploadResult> {
    const fileUrl = URL.createObjectURL(file);
    return {
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  }

  /**
   * Trigger a browser download for a report.
   * For cloud storage: fetch a time-limited signed URL first.
   */
  download(report: MedicalReport): void {
    if (!report.fileUrl) return;
    const a = document.createElement("a");
    a.href = report.fileUrl;
    a.download = report.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Free resources associated with a stored file.
   * For cloud storage: send a DELETE request to your API.
   */
  deleteFile(fileUrl: string): void {
    if (fileUrl && fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(fileUrl);
    }
  }

  /**
   * Return the URL to use for in-page preview.
   * For cloud storage: return a short-lived signed GET URL.
   */
  previewUrl(report: MedicalReport): string {
    return report.fileUrl;
  }
}

export const reportStorage = new ReportStorageService();
