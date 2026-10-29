import { env } from '../config/env';
import { queueCacheManager } from '../infra/queue-cache';

export interface DispatchedEmail {
  id: string;
  to: string;
  subject: string;
  provider: 'resend' | 'smtp';
  status: 'sent' | 'simulated-dev';
  sentAt: string;
}

class MailDeliveryService {
  private sentEmails: DispatchedEmail[] = [];

  public async sendPasswordRecoveryEmail(params: {
    to: string;
    userName: string;
    rawToken: string;
  }): Promise<{
    provider: 'resend' | 'smtp';
    status: 'sent' | 'simulated-dev';
    jobId: string;
  }> {
    const provider = env.MAIL_PROVIDER;
    const subject = 'Kore Base — Password Recovery Token';
    const htmlBody = `
      <div style="font-family: sans-serif; color: #0f172a; max-width: 520px;">
        <h2 style="margin-bottom: 8px;">Password Recovery</h2>
        <p>Hello ${params.userName},</p>
        <p>Use the recovery token below to reset your password on the sign-in screen:</p>
        <pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-weight: 600;">${params.rawToken}</pre>
        <p style="font-size: 12px; color: #64748b;">This token expires in 30 minutes.</p>
      </div>
    `;

    // Enqueue background job in BullMQ adapter
    const job = queueCacheManager.enqueueJob({
      queueName: 'email-dispatch',
      name: 'password-recovery-email',
      payload: {
        to: params.to,
        provider,
        from: env.MAIL_FROM,
      },
    });

    let deliveryStatus: 'sent' | 'simulated-dev' = 'simulated-dev';

    // If Resend API key is configured, dispatch via Resend REST API
    if (provider === 'resend' && env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.MAIL_FROM,
            to: [params.to],
            subject,
            html: htmlBody,
          }),
        });
        if (response.ok) {
          deliveryStatus = 'sent';
        }
      } catch {
        deliveryStatus = 'simulated-dev';
      }
    }

    this.sentEmails.unshift({
      id: job.id,
      to: params.to,
      subject,
      provider,
      status: deliveryStatus,
      sentAt: new Date().toISOString(),
    });

    return {
      provider,
      status: deliveryStatus,
      jobId: job.id,
    };
  }

  public getSentCount(): number {
    return this.sentEmails.length;
  }
}

export const mailService = new MailDeliveryService();
