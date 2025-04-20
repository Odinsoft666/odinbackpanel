import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendEmail } from '../utils/email.js';

class NotificationService {
  static async notifyUsers(type, payload) {
    // Get all users who should receive this notification
    const users = await User.find({ notificationPreferences: type });
    
    // Create notifications
    const notifications = users.map(user => ({
      userId: user._id,
      type,
      title: this.getTitle(type, payload),
      message: this.getMessage(type, payload),
      relatedEntity: payload.id,
      metadata: payload
    }));
    
    await Notification.insertMany(notifications);
    
    // Send emails
    users.forEach(user => {
      sendEmail({
        to: user.email,
        subject: this.getTitle(type, payload),
        html: this.getEmailContent(type, payload)
      });
    });
  }

  static getTitle(type, payload) {
    const map = {
      incident: `🚨 Incident: ${payload.title}`,
      maintenance: `🛠 Scheduled Maintenance: ${payload.title}`,
      resolution: `✅ Resolved: ${payload.title}`,
      status_change: `⚠️ Service Status Changed`
    };
    return map[type];
  }

  static getMessage(type, payload) {
    // Similar logic to generate appropriate messages
  }
}

export default NotificationService;