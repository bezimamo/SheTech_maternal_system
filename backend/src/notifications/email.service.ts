import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // Gmail App Password
      },
    });
  }

  async sendVaccinationReminder(
    to: string,
    motherName: string,
    childName: string,
    vaccineName: string,
    scheduledDate: Date,
    facilityName: string,
  ): Promise<void> {
    const dateStr = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">💉 Vaccination Reminder</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Smart Maternal Health System</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 16px;">Dear <strong>${motherName}</strong>,</p>
          <p style="color: #374151;">This is a reminder that your child <strong>${childName}</strong> has a vaccination appointment scheduled:</p>
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vaccine</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${vaccineName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Facility</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${facilityName}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ⚠️ Please bring your child's vaccination card when you visit.
            </p>
          </div>

          <p style="color: #374151;">If you have any questions, please contact your health center.</p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            This is an automated message from the Smart Maternal Health System. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Smart Maternal Health" <${process.env.SMTP_USER}>`,
        to,
        subject: `Vaccination Reminder: ${childName} - ${vaccineName} on ${dateStr}`,
        html,
      });
      this.logger.log(`Vaccination reminder email sent to ${to} for child ${childName}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      // Don't throw — a failed email should not crash the cron job
    }
  }

  async sendPregnancyVisitReminder(
    to: string,
    motherName: string,
    nextVisitDate: Date,
    gestationalAge: number,
    facilityName: string,
  ): Promise<void> {
    const dateStr = nextVisitDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🤰 Antenatal Visit Reminder</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Smart Maternal Health System</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 16px;">Dear <strong>${motherName}</strong>,</p>
          <p style="color: #374151;">This is a reminder that your next antenatal care visit is scheduled for tomorrow:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Gestational Age</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${gestationalAge} weeks</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Facility</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${facilityName}</td>
              </tr>
            </table>
          </div>
          <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #14532d; font-size: 14px;">
              ✅ Please bring your antenatal care card and any previous test results.
            </p>
          </div>
          <p style="color: #374151;">Regular antenatal visits are important for your health and your baby's health.</p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            This is an automated message from the Smart Maternal Health System. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Smart Maternal Health" <${process.env.SMTP_USER}>`,
        to,
        subject: `Antenatal Visit Reminder: ${dateStr}`,
        html,
      });
      this.logger.log(`Pregnancy visit reminder email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send pregnancy visit email to ${to}: ${error.message}`);
    }
  }

  async sendMotherVaccinationReminder(
    to: string,
    motherName: string,
    doseNumber: number,
    scheduledDate: Date,
  ): Promise<void> {
    const dateStr = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">💉 Maternal Vaccination Reminder</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Smart Maternal Health System</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 16px;">Dear <strong>${motherName}</strong>,</p>
          <p style="color: #374151;">Your tetanus toxoid (TD) vaccination appointment is coming up:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Dose:</strong> TD${doseNumber}</p>
            <p style="margin: 0;"><strong>Date:</strong> ${dateStr}</p>
          </div>
          <p style="color: #374151;">Please visit your health center on the scheduled date.</p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Smart Maternal Health" <${process.env.SMTP_USER}>`,
        to,
        subject: `TD${doseNumber} Vaccination Reminder — ${dateStr}`,
        html,
      });
      this.logger.log(`Mother vaccination reminder email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send mother vaccination email to ${to}: ${error.message}`);
    }
  }
}
