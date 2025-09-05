import { InvitationRepository } from './invitation.repository.js';
import { LoggerService } from '../../services/LoggerService.js';

export class InvitationCleanupService {
  private cleanupInterval?: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 hour

  constructor(
    private invitationRepository: InvitationRepository,
    private logger: LoggerService
  ) {}

  /**
   * Start the cleanup service
   */
  start(): void {
    this.logger.info('Starting invitation cleanup service');
    
    // Run cleanup immediately
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      this.logger.info('Invitation cleanup service stopped');
    }
  }

  /**
   * Run cleanup process
   */
  private async runCleanup(): Promise<void> {
    try {
      this.logger.debug('Running invitation cleanup');
      
      const expiredCount = await this.invitationRepository.expireOldInvitations();
      
      if (expiredCount > 0) {
        this.logger.info(`Expired ${expiredCount} old invitations`);
      }
      
    } catch (error) {
      this.logger.error('Error during invitation cleanup', { error });
    }
  }

  /**
   * Manual cleanup trigger
   */
  async runManualCleanup(): Promise<number> {
    this.logger.info('Running manual invitation cleanup');
    return await this.invitationRepository.expireOldInvitations();
  }
}