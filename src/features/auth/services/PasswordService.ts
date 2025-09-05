import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { LoggerService } from '../../../services/LoggerService.js';
import { SecuritySettings } from '../auth.types.js';

export class PasswordService {
  private readonly saltRounds: number = 12;

  constructor(
    private logger: LoggerService,
    private securitySettings: SecuritySettings
  ) {}

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      this.logger.debug('Password hashed successfully');
      return hash;
    } catch (error) {
      this.logger.error('Failed to hash password', { error });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      this.logger.debug('Password verification completed', { isValid });
      return isValid;
    } catch (error) {
      this.logger.error('Failed to verify password', { error });
      return false;
    }
  }

  /**
   * Validate password strength according to security settings
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < this.securitySettings.passwordMinLength) {
      errors.push(`Password must be at least ${this.securitySettings.passwordMinLength} characters long`);
    }

    // Check for uppercase letters
    if (this.securitySettings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letters
    if (this.securitySettings.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (this.securitySettings.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for symbols
    if (this.securitySettings.passwordRequireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome'
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and weak');
    }

    // Check for sequential characters
    if (this.hasSequentialChars(password)) {
      errors.push('Password cannot contain sequential characters (e.g., 123, abc)');
    }

    // Check for repeated characters
    if (this.hasRepeatedChars(password)) {
      errors.push('Password cannot contain too many repeated characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a secure temporary password
   */
  generateTemporaryPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure password meets all requirements
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); // Uppercase
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz'); // Lowercase
    password += this.getRandomChar('0123456789'); // Number
    password += this.getRandomChar('!@#$%^&*'); // Symbol

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if password contains sequential characters (4+ chars)
   */
  private hasSequentialChars(password: string): boolean {
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

  /**
   * Check if password has too many repeated characters
   */
  private hasRepeatedChars(password: string): boolean {
    const charCount: Record<string, number> = {};
    let maxCount = 0;

    for (const char of password.toLowerCase()) {
      charCount[char] = (charCount[char] || 0) + 1;
      maxCount = Math.max(maxCount, charCount[char]);
    }

    // Allow up to 3 repeated characters for longer passwords
    const maxAllowed = Math.max(3, Math.floor(password.length / 4));
    return maxCount > maxAllowed;
  }

  /**
   * Get random character from charset
   */
  private getRandomChar(charset: string): string {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset.charAt(randomIndex);
  }

  /**
   * Calculate password entropy (strength score)
   */
  calculatePasswordEntropy(password: string): number {
    let charset = 0;

    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/[0-9]/.test(password)) charset += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charset += 32;

    return Math.log2(Math.pow(charset, password.length));
  }

  /**
   * Get password strength level
   */
  getPasswordStrengthLevel(password: string): 'very_weak' | 'weak' | 'fair' | 'good' | 'strong' {
    const entropy = this.calculatePasswordEntropy(password);

    if (entropy < 28) return 'very_weak';
    if (entropy < 36) return 'weak';
    if (entropy < 60) return 'fair';
    if (entropy < 128) return 'good';
    return 'strong';
  }

  /**
   * Generate password suggestions
   */
  generatePasswordSuggestions(count: number = 3): string[] {
    const suggestions = [];
    
    for (let i = 0; i < count; i++) {
      suggestions.push(this.generateTemporaryPassword(16));
    }

    return suggestions;
  }

  /**
   * Check if password has been compromised (basic implementation)
   * In production, you might want to integrate with HaveIBeenPwned API
   */
  async isPasswordCompromised(password: string): Promise<boolean> {
    try {
      // Simple hash check against common compromised passwords
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      
      // This is a simplified check - in production you'd check against a real database
      // or use the HaveIBeenPwned API
      const commonHashes = new Set([
        '5E884898DA28047151D0E56F8DC6292773603D0D6AABBDD62A11EF721D1542D8', // 'password'
        'E38AD214943DAAD1D64C102FAEC29DE4AFE9DA3D', // 'password123'
        '7C4A8D09CA3762AF61E59520943DC26494F8941B', // '123456'
      ]);

      return commonHashes.has(hash);
    } catch (error) {
      this.logger.error('Error checking password compromise', { error });
      return false;
    }
  }
}