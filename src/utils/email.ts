export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // TODO: Implement actual email sending logic
  console.log('Sending email:', options);
} 