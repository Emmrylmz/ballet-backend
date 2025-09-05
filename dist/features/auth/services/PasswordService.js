import bcrypt from 'bcrypt';
import crypto from 'crypto';
export class PasswordService {
    logger;
    securitySettings;
    saltRounds = 12;
    constructor(logger, securitySettings) {
        this.logger = logger;
        this.securitySettings = securitySettings;
    }
    async hashPassword(password) {
        try {
            const hash = await bcrypt.hash(password, this.saltRounds);
            this.logger.debug('Password hashed successfully');
            return hash;
        }
        catch (error) {
            this.logger.error('Failed to hash password', { error });
            throw new Error('Password hashing failed');
        }
    }
    async verifyPassword(password, hash) {
        try {
            const isValid = await bcrypt.compare(password, hash);
            this.logger.debug('Password verification completed', { isValid });
            return isValid;
        }
        catch (error) {
            this.logger.error('Failed to verify password', { error });
            return false;
        }
    }
    validatePasswordStrength(password) {
        const errors = [];
        if (password.length < this.securitySettings.passwordMinLength) {
            errors.push(`Password must be at least ${this.securitySettings.passwordMinLength} characters long`);
        }
        if (this.securitySettings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (this.securitySettings.passwordRequireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (this.securitySettings.passwordRequireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (this.securitySettings.passwordRequireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        const weakPasswords = [
            'password', 'password123', '123456', '123456789', 'qwerty',
            'abc123', 'password1', 'admin', 'letmein', 'welcome'
        ];
        if (weakPasswords.includes(password.toLowerCase())) {
            errors.push('Password is too common and weak');
        }
        if (this.hasSequentialChars(password)) {
            errors.push('Password cannot contain sequential characters (e.g., 123, abc)');
        }
        if (this.hasRepeatedChars(password)) {
            errors.push('Password cannot contain too many repeated characters');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    generateTemporaryPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz');
        password += this.getRandomChar('0123456789');
        password += this.getRandomChar('!@#$%^&*');
        for (let i = 4; i < length; i++) {
            password += this.getRandomChar(charset);
        }
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    hasSequentialChars(password) {
        const sequences = [
            'abcdefghijklmnopqrstuvwxyz',
            '0123456789',
            'qwertyuiopasdfghjklzxcvbnm'
        ];
        for (const sequence of sequences) {
            for (let i = 0; i <= sequence.length - 4; i++) {
                const subseq = sequence.substring(i, i + 4);
                const reverseSubseq = subseq.split('').reverse().join('');
                if (password.toLowerCase().includes(subseq) ||
                    password.toLowerCase().includes(reverseSubseq)) {
                    return true;
                }
            }
        }
        return false;
    }
    hasRepeatedChars(password) {
        const charCount = {};
        let maxCount = 0;
        for (const char of password.toLowerCase()) {
            charCount[char] = (charCount[char] || 0) + 1;
            maxCount = Math.max(maxCount, charCount[char]);
        }
        const maxAllowed = Math.max(3, Math.floor(password.length / 4));
        return maxCount > maxAllowed;
    }
    getRandomChar(charset) {
        const randomIndex = crypto.randomInt(0, charset.length);
        return charset.charAt(randomIndex);
    }
    calculatePasswordEntropy(password) {
        let charset = 0;
        if (/[a-z]/.test(password))
            charset += 26;
        if (/[A-Z]/.test(password))
            charset += 26;
        if (/[0-9]/.test(password))
            charset += 10;
        if (/[^a-zA-Z0-9]/.test(password))
            charset += 32;
        return Math.log2(Math.pow(charset, password.length));
    }
    getPasswordStrengthLevel(password) {
        const entropy = this.calculatePasswordEntropy(password);
        if (entropy < 28)
            return 'very_weak';
        if (entropy < 36)
            return 'weak';
        if (entropy < 60)
            return 'fair';
        if (entropy < 128)
            return 'good';
        return 'strong';
    }
    generatePasswordSuggestions(count = 3) {
        const suggestions = [];
        for (let i = 0; i < count; i++) {
            suggestions.push(this.generateTemporaryPassword(16));
        }
        return suggestions;
    }
    async isPasswordCompromised(password) {
        try {
            const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
            const commonHashes = new Set([
                '5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8',
                'E38AD214943DAAD1D64C102FAEC29DE4AFE9DA3D',
                '7C4A8D09CA3762AF61E59520943DC26494F8941B',
            ]);
            return commonHashes.has(hash);
        }
        catch (error) {
            this.logger.error('Error checking password compromise', { error });
            return false;
        }
    }
}
