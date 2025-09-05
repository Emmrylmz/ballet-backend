import { LoggerService } from "../../../services/LoggerService.js";
import {
  ActivationEmailData,
  PasswordResetEmailData,
  EmailTemplate,
} from "../auth.types.js";

// Email service interface - can be implemented with different providers
export interface EmailProvider {
  sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean>;
}

// Simple console email provider for development
export class ConsoleEmailProvider implements EmailProvider {
  constructor(private logger: LoggerService) {}

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    this.logger.info("📧 EMAIL SENT (Console)", {
      to,
      subject,
      html,
      text,
    });
    console.log(`\n📧 EMAIL TO: ${to}`);
    console.log(`📧 SUBJECT: ${subject}`);
    console.log(`📧 HTML:\n${html}`);
    if (text) {
      console.log(`📧 TEXT:\n${text}`);
    }
    console.log("📧 END EMAIL\n");
    return true;
  }
}

// SMTP Email provider (can be implemented with nodemailer or similar)
export class SMTPEmailProvider implements EmailProvider {
  constructor(
    private config: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
      from: string;
    },
    private logger: LoggerService
  ) {}

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      // TODO: Implement with nodemailer or your preferred email service
      this.logger.info("Email sent via SMTP", { to, subject });
      return true;
    } catch (error) {
      this.logger.error("Failed to send email via SMTP", {
        error,
        to,
        subject,
      });
      return false;
    }
  }
}

export class EmailService {
  constructor(
    private emailProvider: EmailProvider,
    private logger: LoggerService,
    private config: {
      frontendUrl: string;
      companyName: string;
      supportEmail: string;
    }
  ) {}

  /**
   * Send account activation email with deep link
   */
  async sendActivationEmail(data: ActivationEmailData): Promise<boolean> {
    try {
      const template = this.getActivationEmailTemplate(data);

      const success = await this.emailProvider.sendEmail(
        data.user.email,
        template.subject,
        template.html,
        template.text
      );

      if (success) {
        this.logger.info("Account activation email sent", {
          email: data.user.email,
        });
      }

      return success;
    } catch (error) {
      this.logger.error("Failed to send activation email", {
        error,
        email: data.user.email,
      });
      return false;
    }
  }

  /**
   * Send password reset email with deep link
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      const template = this.getPasswordResetEmailTemplate(data);

      const success = await this.emailProvider.sendEmail(
        data.user.email,
        template.subject,
        template.html,
        template.text
      );

      if (success) {
        this.logger.info("Password reset email sent", {
          email: data.user.email,
        });
      }

      return success;
    } catch (error) {
      this.logger.error("Failed to send password reset email", {
        error,
        email: data.user.email,
      });
      return false;
    }
  }

  /**
   * Send welcome email after successful activation
   */
  async sendWelcomeEmail(
    user: { firstName: string; email: string },
    establishment?: { name: string; businessName: string } | null
  ): Promise<boolean> {
    try {
      const template = this.getWelcomeEmailTemplate(user, establishment);

      const success = await this.emailProvider.sendEmail(
        user.email,
        template.subject,
        template.html,
        template.text
      );

      if (success) {
        this.logger.info("Welcome email sent", {
          email: user.email,
          establishmentName: establishment?.name || 'General',
        });
      }

      return success;
    } catch (error) {
      this.logger.error("Failed to send welcome email", {
        error,
        email: user.email,
      });
      return false;
    }
  }

  /**
   * Get activation email template
   */
  private getActivationEmailTemplate(data: ActivationEmailData): EmailTemplate {
    const subject = `Activate Your ${this.config.companyName} Account`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { opacity: 0.9; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🩰 Welcome to ${this.config.companyName}</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.user.firstName}!</h2>
          
          ${
            data.invitedBy
              ? `<p>You've been invited to join <strong>${this.config.companyName}</strong>. To get started, please activate your account by clicking the button below.</p>`
              : `<p>Welcome to <strong>${this.config.companyName}</strong>! To get started, please activate your account by clicking the button below.</p>`
          }
          
          <div style="text-align: center;">
            <a href="${
              data.activationUrl
            }" class="button">Activate My Account</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${data.activationUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Security Note:</strong> This activation link will expire in ${
              data.expiresIn
            }. If you didn't request this account, please ignore this email.
          </div>
          
          <p>After activating your account, managers will be able to assign you to establishments and roles.</p>
          
          <p>If you have any questions, feel free to reach out to our support team.</p>
          
          <p>Best regards,<br>The ${this.config.companyName} Team</p>
        </div>
        <div class="footer">
          <p>© 2024 ${this.config.companyName}. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:${
            this.config.supportEmail
          }">${this.config.supportEmail}</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
Welcome to ${this.config.companyName}!

Hello ${data.user.firstName},

${
  data.invitedBy
    ? `You've been invited to join ${this.config.companyName}. To get started, please activate your account.`
    : `Welcome to ${this.config.companyName}! To get started, please activate your account.`
}

Activate your account by clicking this link:
${data.activationUrl}

This link will expire in ${
      data.expiresIn
    }. If you didn't request this account, please ignore this email.

Best regards,
The ${this.config.companyName} Team
    `;

    return { subject, html, text };
  }

  /**
   * Get password reset email template
   */
  private getPasswordResetEmailTemplate(
    data: PasswordResetEmailData
  ): EmailTemplate {
    const subject = `Reset Your Password - ${data.user.firstName}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        .warning { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.user.firstName}!</h2>
          
          
          <div style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${data.resetUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Security Note:</strong> This password reset link will expire in ${data.expiresIn}. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
          </div>
          
          <p>For your security:</p>
          <ul>
            <li>This link can only be used once</li>
            <li>We recommend using a strong, unique password</li>
            <li>Never share your password with anyone</li>
          </ul>
          
          <p>If you continue to have problems, contact our support team.</p>
          
        </div>
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `

Hello ${data.user.firstName},

We received a request to reset the password for your  account.

Reset your password by clicking this link:
${data.resetUrl}

This link will expire in ${data.expiresIn}. If you didn't request this password reset, please ignore this email.

Best regards,
The Team
    `;

    return { subject, html, text };
  }

  /**
   * Get welcome email template
   */
  private getWelcomeEmailTemplate(
    user: { firstName: string; email: string },
    establishment?: { name: string; businessName: string } | null
  ): EmailTemplate {
    const companyName = establishment?.businessName || this.config.companyName;
    const subject = `Welcome to ${companyName}! Your Account is Ready`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to ${companyName}!</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.firstName}!</h2>
          
          <p>Congratulations! Your account has been successfully activated and you're now part of the ${companyName} community.</p>
          
          <div style="text-align: center;">
            <a href="${this.config.frontendUrl}/login" class="button">Start Using Your Account</a>
          </div>
          
          <p>Here's what you can do now:</p>
          <ul>
            <li>📅 View and book your classes</li>
            <li>📊 Track your progress and attendance</li>
            <li>💬 Connect with instructors and fellow students</li>
            <li>⚙️ Manage your profile and preferences</li>
            <li>💳 Handle payments and packages</li>
          </ul>
          
          <p>We're excited to have you on board and look forward to supporting you on your fitness journey!</p>
          
          <p>Best regards,<br>The ${companyName} Team</p>
        </div>
        <div class="footer">
          <p>© 2024 ${companyName}. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:${this.config.supportEmail}">${this.config.supportEmail}</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    const text = `
Welcome to ${companyName}!

Hello ${user.firstName},

Congratulations! Your account has been successfully activated and you're now part of the ${companyName} community.

You can now log in and start using your account: ${this.config.frontendUrl}/login

Here's what you can do:
- View and book your classes
- Track your progress and attendance
- Connect with instructors and fellow students
- Manage your profile and preferences
- Handle payments and packages

We're excited to have you on board!

Best regards,
The ${companyName} Team
    `;

    return { subject, html, text };
  }
}
