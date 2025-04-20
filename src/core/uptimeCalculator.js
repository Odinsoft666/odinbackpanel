import { UptimeRecord } from '../models/UptimeRecord.js';

class UptimeCalculator {
  static async calculateDailyUptime() {
    const services = ['api', 'database', 'payment', 'auth'];
    const promises = services.map(service => this.calculateForService(service));
    await Promise.all(promises);
  }

  static async calculateForService(service) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const incidents = await Incident.find({
      components: service,
      startTime: { $gte: yesterday }
    });
    
    const downtimeMinutes = incidents.reduce((total, incident) => {
      const duration = (incident.endTime || new Date()) - incident.startTime;
      return total + Math.round(duration / (1000 * 60));
    }, 0);
    
    const uptimePercentage = 100 - (downtimeMinutes / (24 * 60) * 100);
    
    await UptimeRecord.create({
      service,
      date: yesterday,
      uptimePercentage,
      downtimeMinutes,
      incidents: incidents.map(i => i._id)
    });
  }
}

// Run daily at midnight
new CronJob('0 0 * * *', UptimeCalculator.calculateDailyUptime, null, true);