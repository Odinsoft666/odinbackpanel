import axios from 'axios';
import { ErrorCatalog } from '../core/errorCodes.js';

export class AlertManager {
  static async trigger(errorCode, context) {
    const error = ErrorCatalog[errorCode] || {
      code: 'UNKNOWN',
      message: 'Unknown error',
      solution: 'Check application logs'
    };

    // 1. Discord Alert
    if (process.env.DISCORD_WEBHOOK) {
      try {
        await axios.post(process.env.DISCORD_WEBHOOK, {
          embeds: [{
            title: `🚨 ${error.code}: ${error.severity || 'HIGH'}`,
            description: `**Path**: ${context.route || 'Unknown'}\n` +
                        `**User**: ${context.userId || 'Guest'}\n` +
                        `**Solution**: ${error.solution || error.action || 'No resolution steps available'}`,
            color: this.getColor(error.severity),
            timestamp: new Date()
          }]
        });
      } catch (err) {
        console.error('Failed to send Discord alert:', err.message);
      }
    }

    // 2. SMS Alert for CRITICAL
    if (error.severity === 'CRITICAL' && process.env.TWILIO_SID) {
      this.sendSMS(
        process.env.ADMIN_PHONE,
        `[${error.code}] ${error.message}\nRef: ${context.errorId}`
      );
    }
  }

  static getColor(severity) {
    const colors = {
      CRITICAL: 0xFF0000, // Red
      HIGH: 0xFFA500,     // Orange
      MEDIUM: 0xFFFF00    // Yellow
    };
    return colors[severity] || 0x808080; // Gray
  }

  static async sendSMS(to, body) {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('Twilio credentials missing');
      return;
    }
    
    try {
      const client = (await import('twilio')).default;
      const twilioClient = client(
        process.env.TWILIO_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_PHONE,
        to
      });
    } catch (err) {
      console.error('Failed to send SMS:', err.message);
    }
  }
}