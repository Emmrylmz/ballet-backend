import { InvitationRepository } from './invitation.repository.js';
import { LoggerService } from '../../services/LoggerService.js';
export declare class InvitationCleanupService {
    private invitationRepository;
    private logger;
    private cleanupInterval?;
    private readonly CLEANUP_INTERVAL_MS;
    constructor(invitationRepository: InvitationRepository, logger: LoggerService);
    start(): void;
    stop(): void;
    private runCleanup;
    runManualCleanup(): Promise<number>;
}
