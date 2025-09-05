import { LoggerService } from '../../../services/LoggerService.js';
import { SecuritySettings } from '../auth.types.js';
export declare class PasswordService {
    private logger;
    private securitySettings;
    private readonly saltRounds;
    constructor(logger: LoggerService, securitySettings: SecuritySettings);
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hash: string): Promise<boolean>;
    validatePasswordStrength(password: string): {
        isValid: boolean;
        errors: string[];
    };
    generateTemporaryPassword(length?: number): string;
    generatePasswordResetToken(): string;
    private hasSequentialChars;
    private hasRepeatedChars;
    private getRandomChar;
    calculatePasswordEntropy(password: string): number;
    getPasswordStrengthLevel(password: string): 'very_weak' | 'weak' | 'fair' | 'good' | 'strong';
    generatePasswordSuggestions(count?: number): string[];
    isPasswordCompromised(password: string): Promise<boolean>;
}
