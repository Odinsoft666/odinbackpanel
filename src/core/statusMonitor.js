import { EventEmitter } from 'events';
import { Incident } from '../models/Incident.js';
import { Maintenance } from '../models/Maintenance.js';
import { UptimeRecord } from '../models/UptimeRecord.js';
import User from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';
import { logger } from '../utils/logger.js';

class StatusMonitor extends EventEmitter {
  constructor() {
    super();
    this.services = {
      api: { name: 'API Gateway', status: 'operational', uptime: 100 },
      database: { name: 'Database', status: 'operational', uptime: 100 },
      payment: { name: 'Payment Gateway', status: 'operational', uptime: 100 },
      auth: { name: 'Authentication', status: 'operational', uptime: 100 }
    };
    this.maintenanceMode = false;
    this.intervals = {};
    this.checkIntervals();
  }

  checkIntervals() {
    this.clearIntervals();
    
    Object.keys(this.services).forEach(service => {
      this.intervals[service] = setInterval(async () => {
        try {
          await this.performHealthCheck(service);
        } catch (error) {
          logger.error(`Health check failed for ${service}:`, error);
        }
      }, 300000); // 5 minutes
    });
  }

  clearIntervals() {
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
  }

  async performHealthCheck(service) {
    const isHealthy = await this.checkService(service);
    if (!isHealthy) {
      await this.logIncident({
        code: `HEALTH_${service.toUpperCase()}_FAIL`,
        message: `${service} service is not responding`,
        severity: 'HIGH'
      }, { service });
    }
    return isHealthy;
  }

  async checkService(service) {
    switch(service) {
      case 'api':
        return this.checkApiService();
      case 'database':
        return this.checkDatabaseService();
      case 'payment':
        return this.checkPaymentService();
      case 'auth':
        return this.checkAuthService();
      default:
        return true;
    }
  }

  async checkApiService() {
    try {
      const response = await fetch(`${process.env.API_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkDatabaseService() {
    try {
      // Implementation depends on your database setup
      return true;
    } catch {
      return false;
    }
  }

  async checkPaymentService() {
    try {
      // Implementation depends on your payment provider
      return true;
    } catch {
      return false;
    }
  }

  async checkAuthService() {
    try {
      const response = await fetch(`${process.env.AUTH_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkScheduledMaintenance() {
    try {
      const now = new Date();
      const activeMaintenance = await Maintenance.find({
        startTime: { $lte: now },
        endTime: { $gte: now },
        status: { $ne: 'completed' }
      });

      const upcomingMaintenance = await Maintenance.find({
        startTime: { 
          $gte: now,
          $lte: new Date(now.getTime() + 15 * 60 * 1000)
        },
        status: 'scheduled'
      });

      if (activeMaintenance.length > 0 || upcomingMaintenance.length > 0) {
        const allMaintenance = [...activeMaintenance, ...upcomingMaintenance];
        
        for (const maintenance of allMaintenance) {
          if (!this.services[maintenance.service]) continue;
          
          if (maintenance.startTime <= now && maintenance.endTime >= now) {
            this.services[maintenance.service].status = 'maintenance';
            this.emit('maintenance', {
              service: maintenance.service,
              status: 'maintenance',
              maintenanceId: maintenance._id
            });
          }
          
          if (maintenance.startTime > now) {
            await this.notifyUpcomingMaintenance(maintenance);
          }
        }
      }
      
      logger.debug('Scheduled maintenance check completed');
      return true;
    } catch (error) {
      logger.error('Failed to check scheduled maintenance:', error);
      return false;
    }
  }

  async notifyUpcomingMaintenance(maintenance) {
    const users = await User.find({
      'notificationPreferences.email.maintenance': true,
      'services': maintenance.service
    });

    await Promise.all(users.map(async user => {
      const notification = new Notification({
        userId: user._id,
        type: 'maintenance',
        title: `Upcoming Maintenance: ${maintenance.service}`,
        message: maintenance.message,
        relatedEntity: maintenance._id,
        metadata: {
          startTime: maintenance.startTime,
          endTime: maintenance.endTime
        }
      });
      
      await notification.save();
      
      await sendEmail({
        to: user.email,
        subject: `[Maintenance Notice] ${maintenance.service}`,
        html: this.generateMaintenanceEmail(maintenance, user)
      });
    }));
  }

  generateMaintenanceEmail(maintenance, user) {
    return `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #f39c12;">Upcoming Maintenance Notification</h2>
        <p><strong>Service:</strong> ${maintenance.service}</p>
        <p><strong>Scheduled Start:</strong> ${maintenance.startTime.toLocaleString()}</p>
        <p><strong>Expected End:</strong> ${maintenance.endTime.toLocaleString()}</p>
        <p><strong>Description:</strong> ${maintenance.message}</p>
        <p><a href="${process.env.BASE_URL}/status/maintenance/${maintenance._id}">View Details</a></p>
      </div>
    `;
  }

  // ... (rest of the existing methods remain unchanged)
}

export const statusMonitor = new StatusMonitor();