import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any;
  private readonly isConfigured: boolean;

  constructor() {
    const apiKey = process.env.AT_API_KEY;
    const username = process.env.AT_USERNAME;

    if (apiKey && username) {
      try {
        // Fix SSL certificate verification issue on Windows/corporate networks
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AfricasTalking = require('africastalking');
        this.client = AfricasTalking({ apiKey, username });
        this.isConfigured = true;
        this.logger.log(`SMS service initialized (username: ${username}, sandbox: ${username === 'sandbox'})`);
      } catch (err) {
        this.logger.warn(`africastalking package not found or init failed: ${err.message}. SMS will be skipped.`);
        this.isConfigured = false;
      }
    } else {
      this.logger.warn('AT_API_KEY or AT_USERNAME not set. SMS notifications disabled.');
      this.isConfigured = false;
    }
  }

  /** Direct test method — call from controller to verify SMS works */
  async sendTestSms(phone: string): Promise<{ success: boolean; result?: any; error?: string; normalizedPhone: string }> {
    const normalizedPhone = this.normalizePhone(phone);
    if (!this.isConfigured) {
      return { success: false, error: 'SMS not configured — check AT_API_KEY and AT_USERNAME in .env', normalizedPhone };
    }
    try {
      const result = await this.client.SMS.send({
        to: [normalizedPhone],
        message: 'ሰላም የቀጠሮ 3 ቀን ስለቀረው አስታውሰው በሰአቱ ክትትል ወደሚያደርጉበት የጤና ተቋም ይገኙ !',
        from: process.env.AT_SENDER_ID || undefined,
      });
      this.logger.log(`TEST SMS result: ${JSON.stringify(result)}`);
      const recipients = result?.SMSMessageData?.Recipients || [];
      const status = recipients[0]?.status || 'unknown';
      const cost = recipients[0]?.cost || 'unknown';
      return { success: true, result: { recipients, status, cost }, normalizedPhone };
    } catch (error) {
      this.logger.error(`TEST SMS failed to ${normalizedPhone}: ${error.message}`);
      return { success: false, error: error.message, normalizedPhone };
    }
  }

  async sendVaccinationReminder(
    phone: string,
    motherName: string,
    childName: string,
    vaccineName: string,
    scheduledDate: Date,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`[SMS SKIPPED] Would send to ${phone}: vaccination reminder for ${childName}`);
      return;
    }

    const dateStr = scheduledDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const message =
      `Dear ${motherName}, this is a reminder that ${childName}'s ` +
      `${vaccineName} vaccination is scheduled for ${dateStr}. ` +
      `Please visit your health center. - Smart Maternal Health`;

    // Normalize phone number to E.164 format
    const normalizedPhone = this.normalizePhone(phone);

    try {
      const sms = this.client.SMS;
      const result = await sms.send({
        to: [normalizedPhone],
        message,
        from: process.env.AT_SENDER_ID || undefined,
      });
      this.logger.log(`SMS sent to ${normalizedPhone}: ${JSON.stringify(result?.SMSMessageData?.Recipients)}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${normalizedPhone}: ${error.message}`);
      // Don't throw — a failed SMS should not crash the cron job
    }
  }

  async sendPregnancyVisitReminder(
    phone: string,
    motherName: string,
    nextVisitDate: Date,
    gestationalAge: number,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`[SMS SKIPPED] Would send pregnancy visit reminder to ${phone}`);
      return;
    }

    const dateStr = nextVisitDate.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    const message =
      `Dear ${motherName}, your next antenatal care visit is scheduled for ${dateStr} ` +
      `(${gestationalAge} weeks). Please visit your health center. - Smart Maternal Health`;

    const normalizedPhone = this.normalizePhone(phone);

    try {
      const sms = this.client.SMS;
      const result = await sms.send({
        to: [normalizedPhone],
        message,
        from: process.env.AT_SENDER_ID || undefined,
      });
      this.logger.log(`Pregnancy visit SMS sent to ${normalizedPhone}: ${JSON.stringify(result?.SMSMessageData?.Recipients)}`);
    } catch (error) {
      this.logger.error(`Failed to send pregnancy visit SMS to ${normalizedPhone}: ${error.message}`);
    }
  }

  async sendMaternalVaccineReminder(
    phone: string,
    motherName: string,
    vaccineName: string,
    doseNumber: number,
    scheduledDate: Date,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`[SMS SKIPPED] Maternal vaccine reminder to ${phone}`);
      return;
    }
    const dateStr = scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const message = `Dear ${motherName}, your ${vaccineName} (Dose ${doseNumber}) is scheduled for ${dateStr}. Please visit your health center. - Smart Maternal Health`;
    const normalizedPhone = this.normalizePhone(phone);
    try {
      const result = await this.client.SMS.send({ to: [normalizedPhone], message, from: process.env.AT_SENDER_ID || undefined });
      this.logger.log(`Maternal vaccine SMS sent to ${normalizedPhone}: ${JSON.stringify(result?.SMSMessageData?.Recipients)}`);
    } catch (error) {
      this.logger.error(`Failed to send maternal vaccine SMS to ${normalizedPhone}: ${error.message}`);
    }
  }

  async sendAncMissedVisitAlert(
    phone: string,
    motherName: string,
    missedDate: Date,
    rescheduleDate: Date,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.debug(`[SMS SKIPPED] Missed visit alert to ${phone}`);
      return;
    }
    const missed = missedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const rescheduled = rescheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const message = `Dear ${motherName}, you missed your ANC visit on ${missed}. Your next visit has been rescheduled to ${rescheduled}. Please attend. - Smart Maternal Health`;
    const normalizedPhone = this.normalizePhone(phone);
    try {
      await this.client.SMS.send({ to: [normalizedPhone], message, from: process.env.AT_SENDER_ID || undefined });
      this.logger.log(`Missed visit alert sent to ${normalizedPhone}`);
    } catch (error) {
      this.logger.error(`Failed to send missed visit alert to ${normalizedPhone}: ${error.message}`);
    }
  }

  private normalizePhone(phone: string): string {
    // Remove spaces and dashes
    let cleaned = phone.replace(/[\s\-]/g, '');
    // Ethiopian numbers: 09XXXXXXXX → +2519XXXXXXXX
    if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
      cleaned = '+251' + cleaned.slice(1);
    }
    // Already has country code without +
    if (cleaned.startsWith('251') && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }
}
