export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

import { Resend } from 'resend';

// Initialize the Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    // Simple template processing
    let htmlContent = '';
    switch (options.template) {
      case 'appointment-confirmation':
        htmlContent = `
          <h1>Appointment Confirmation</h1>
          <p>Dear ${options.data.userName},</p>
          <p>Your appointment has been confirmed for ${options.data.date} at ${options.data.time}.</p>
          <p>Service: ${options.data.serviceName}</p>
          <p>Location: ${options.data.locationName}</p>
          <p>Employee: ${options.data.employeeName}</p>
          <p>Thank you for your booking!</p>
        `;
        break;
      case 'appointment-cancellation':
        htmlContent = `
          <h1>Appointment Cancellation</h1>
          <p>Dear ${options.data.userName},</p>
          <p>Your appointment scheduled for ${options.data.date} at ${options.data.time} has been cancelled.</p>
          <p>Reason: ${options.data.reason || 'Not specified'}</p>
          <p>If you have any questions, please contact us.</p>
        `;
        break;
      default:
        htmlContent = `<p>${JSON.stringify(options.data)}</p>`;
    }
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: options.to,
      subject: options.subject,
      html: htmlContent,
    });
    
    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Email sent successfully to:', options.to, 'with ID:', data?.id);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Email delivery failed');
  }
} 