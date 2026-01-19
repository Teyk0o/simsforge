/**
 * Mod Download Queue Service
 *
 * Manages parallel mod downloads with configurable concurrency limit.
 * Allows multiple mods to download simultaneously while maintaining system stability.
 */

import { modInstallationService, ProgressCallback, InstallationResult } from './ModInstallationService';

/**
 * Queued installation job
 */
interface QueuedJob {
  id: string;
  modId: number;
  modsPath: string;
  fileId?: number;
  onProgress?: ProgressCallback;
  onComplete?: (result: InstallationResult) => void;
  priority: number; // Higher = more urgent (default: 0)
}

/**
 * Job status
 */
type JobStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * Job tracking info
 */
interface JobInfo {
  status: JobStatus;
  result?: InstallationResult;
  error?: string;
}

export class ModDownloadQueue {
  private queue: Map<string, QueuedJob> = new Map();
  private jobStatus: Map<string, JobInfo> = new Map();
  private activeDownloads: Set<string> = new Set();
  private maxConcurrent: number;
  private jobCounter = 0;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a mod installation to the queue
   * Returns job ID for tracking
   */
  addJob(
    modId: number,
    modsPath: string,
    fileId?: number,
    onProgress?: ProgressCallback,
    onComplete?: (result: InstallationResult) => void,
    priority: number = 0
  ): string {
    const jobId = `job_${++this.jobCounter}_${Date.now()}`;

    const job: QueuedJob = {
      id: jobId,
      modId,
      modsPath,
      fileId,
      onProgress,
      onComplete,
      priority,
    };

    this.queue.set(jobId, job);
    this.jobStatus.set(jobId, { status: 'pending' });

    // Start processing queue
    this.processQueue();

    return jobId;
  }

  /**
   * Get status of a job
   */
  getJobStatus(jobId: string): JobInfo | undefined {
    return this.jobStatus.get(jobId);
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    const job = this.queue.get(jobId);
    if (!job) return false;

    const status = this.jobStatus.get(jobId);
    if (status?.status === 'in-progress') {
      console.warn(`Cannot cancel job ${jobId}: already in progress`);
      return false;
    }

    this.queue.delete(jobId);
    this.jobStatus.set(jobId, { status: 'failed', error: 'Cancelled by user' });
    return true;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get active download count
   */
  getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Set max concurrent downloads
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.processQueue(); // Process more if limit increased
  }

  /**
   * Get all queued jobs
   */
  getQueuedJobs(): QueuedJob[] {
    return Array.from(this.queue.values());
  }

  /**
   * Clear completed jobs from history
   */
  clearCompleted(): void {
    for (const [jobId, status] of this.jobStatus) {
      if (status.status === 'completed' || status.status === 'failed') {
        if (!this.activeDownloads.has(jobId)) {
          this.jobStatus.delete(jobId);
          this.queue.delete(jobId);
        }
      }
    }
  }

  /**
   * Process queue: start next job if slots available
   */
  private async processQueue(): Promise<void> {
    // Check if we can start more downloads
    while (this.activeDownloads.size < this.maxConcurrent && this.queue.size > 0) {
      // Get next job (sorted by priority)
      const nextJob = this.getNextJob();
      if (!nextJob) break;

      this.activeDownloads.add(nextJob.id);
      this.jobStatus.set(nextJob.id, { status: 'in-progress' });

      // Execute download asynchronously without blocking the queue
      this.executeJob(nextJob).catch((error) => {
        console.error(`Job ${nextJob.id} failed:`, error);
      });
    }
  }

  /**
   * Get next job to process (highest priority first, then FIFO)
   */
  private getNextJob(): QueuedJob | null {
    let maxPriority = -Infinity;
    let nextJob: QueuedJob | null = null;

    for (const job of this.queue.values()) {
      const status = this.jobStatus.get(job.id);
      if (status?.status === 'pending' && job.priority > maxPriority) {
        maxPriority = job.priority;
        nextJob = job;
      }
    }

    return nextJob;
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: QueuedJob): Promise<void> {
    try {
      const result = await modInstallationService.installMod(
        job.modId,
        job.modsPath,
        job.onProgress,
        job.fileId
      );

      this.jobStatus.set(job.id, {
        status: result.success ? 'completed' : 'failed',
        result,
        error: result.error,
      });

      job.onComplete?.(result);
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      this.jobStatus.set(job.id, {
        status: 'failed',
        error: errorMsg,
      });

      job.onComplete?.({
        success: false,
        modName: 'Unknown',
        filesInstalled: [],
        error: errorMsg,
      });
    } finally {
      this.activeDownloads.delete(job.id);
      this.queue.delete(job.id);
      this.processQueue();
    }
  }
}

// Export singleton instance with default concurrency of 3
export const modDownloadQueue = new ModDownloadQueue(3);
