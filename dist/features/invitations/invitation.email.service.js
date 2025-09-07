export class InvitationEmailService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    generateInstructorInvitationEmail(invitation, establishmentName, inviterName, invitationUrl) {
        const subject = `Instructor Invitation - ${establishmentName}`;
        const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Instructor Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to Teach!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${establishmentName}</strong> as an instructor.</p>
            ${invitation.message ? `<p><em>"${invitation.message}"</em></p>` : ''}
            <p>As an instructor, you'll be able to:</p>
            <ul>
              <li>Manage your class schedules</li>
              <li>Track student attendance</li>
              <li>View your teaching dashboard</li>
              <li>Invite students to your classes</li>
            </ul>
            <p>This invitation is valid for <strong>7 days</strong> and can only be used once.</p>
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
            <p>Or copy and paste this link in your browser:</p>
            <p><a href="${invitationUrl}">${invitationUrl}</a></p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This invitation expires on ${new Date(invitation.expiresAt).toLocaleString()}</p>
            <p>${establishmentName} - Powered by Ballet Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const textBody = `
You're Invited to Teach!

Hello,

${inviterName} has invited you to join ${establishmentName} as an instructor.

${invitation.message ? `Message: "${invitation.message}"` : ''}

As an instructor, you'll be able to:
- Manage your class schedules
- Track student attendance  
- View your teaching dashboard
- Invite students to your classes

This invitation is valid for 7 days and can only be used once.

Accept your invitation here: ${invitationUrl}

If you didn't expect this invitation, you can safely ignore this email.

This invitation expires on ${new Date(invitation.expiresAt).toLocaleString()}
${establishmentName} - Powered by Ballet Management System
    `;
        return { subject, htmlBody, textBody };
    }
    generateStudentInvitationEmail(invitation, establishmentName, inviterName, invitationUrl, sessionName) {
        const subject = sessionName
            ? `Class Invitation - ${sessionName} at ${establishmentName}`
            : `Student Invitation - ${establishmentName}`;
        const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Class Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .highlight { background: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
          .button { 
            display: inline-block; 
            background: #28a745; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to Join${sessionName ? ` ${sessionName}` : ' Our Classes'}!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join ${sessionName ? 'a class' : 'classes'} at <strong>${establishmentName}</strong>.</p>
            ${sessionName ? `<div class="highlight"><strong>Class:</strong> ${sessionName}</div>` : ''}
            ${invitation.message ? `<p><em>"${invitation.message}"</em></p>` : ''}
            <p>Join us for an amazing experience with:</p>
            <ul>
              <li>Professional instruction</li>
              <li>Supportive community</li>
              <li>Flexible scheduling</li>
              <li>Progress tracking</li>
            </ul>
            <p>This invitation expires in <strong>${this.calculateTimeRemaining(invitation.expiresAt)}</strong>.</p>
            <a href="${invitationUrl}" class="button">Join Now</a>
            <p>Or copy and paste this link in your browser:</p>
            <p><a href="${invitationUrl}">${invitationUrl}</a></p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This invitation expires on ${new Date(invitation.expiresAt).toLocaleString()}</p>
            <p>${establishmentName} - Powered by Ballet Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const textBody = `
You're Invited to Join${sessionName ? ` ${sessionName}` : ' Our Classes'}!

Hello,

${inviterName} has invited you to join ${sessionName ? 'a class' : 'classes'} at ${establishmentName}.

${sessionName ? `Class: ${sessionName}` : ''}
${invitation.message ? `Message: "${invitation.message}"` : ''}

Join us for an amazing experience with:
- Professional instruction
- Supportive community
- Flexible scheduling  
- Progress tracking

This invitation expires in ${this.calculateTimeRemaining(invitation.expiresAt)}.

Join now: ${invitationUrl}

If you didn't expect this invitation, you can safely ignore this email.

This invitation expires on ${new Date(invitation.expiresAt).toLocaleString()}
${establishmentName} - Powered by Ballet Management System
    `;
        return { subject, htmlBody, textBody };
    }
    calculateTimeRemaining(expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffMs = expiry.getTime() - now.getTime();
        if (diffMs <= 0) {
            return 'expired';
        }
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours === 0) {
            return `${minutes} minutes`;
        }
        else if (hours < 24) {
            return `${hours} hours`;
        }
        else {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return remainingHours > 0 ? `${days} days, ${remainingHours} hours` : `${days} days`;
        }
    }
    generateAcceptanceNotificationEmail(acceptedBy, invitationType, establishmentName, inviterName, sessionName) {
        const subject = `Invitation Accepted - ${acceptedBy} joined ${establishmentName}`;
        const roleText = invitationType === 'instructor' ? 'instructor' : 'student';
        const actionText = sessionName ? `joined the class "${sessionName}"` : `joined as a ${roleText}`;
        const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invitation Accepted</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Great News!</h1>
          </div>
          <div class="content">
            <p>Hello ${inviterName},</p>
            <div class="success">
              <strong>${acceptedBy}</strong> has accepted your invitation and ${actionText} at <strong>${establishmentName}</strong>!
            </div>
            <p>Your invitation was successfully used to welcome a new member to your establishment.</p>
            <p>Thank you for helping grow our community!</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const textBody = `
Great News!

Hello ${inviterName},

${acceptedBy} has accepted your invitation and ${actionText} at ${establishmentName}!

Your invitation was successfully used to welcome a new member to your establishment.

Thank you for helping grow our community!
    `;
        return { subject, htmlBody, textBody };
    }
}
