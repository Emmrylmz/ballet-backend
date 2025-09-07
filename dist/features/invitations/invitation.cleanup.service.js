export class InvitationCleanupService {
    invitationRepository;
    logger;
    cleanupInterval;
    CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
    constructor(invitationRepository, logger) {
        this.invitationRepository = invitationRepository;
        this.logger = logger;
    }
    start() {
        this.logger.info('Starting invitation cleanup service');
        this.runCleanup();
        this.cleanupInterval = setInterval(() => {
            this.runCleanup();
        }, this.CLEANUP_INTERVAL_MS);
    }
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
            this.logger.info('Invitation cleanup service stopped');
        }
    }
    async runCleanup() {
        try {
            this.logger.debug('Running invitation cleanup');
            const expiredCount = await this.invitationRepository.expireOldInvitations();
            if (expiredCount > 0) {
                this.logger.info(`Expired ${expiredCount} old invitations`);
            }
        }
        catch (error) {
            this.logger.error('Error during invitation cleanup', { error });
        }
    }
    async runManualCleanup() {
        this.logger.info('Running manual invitation cleanup');
        return await this.invitationRepository.expireOldInvitations();
    }
}
