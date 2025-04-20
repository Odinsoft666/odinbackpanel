class NotificationCenter {
    constructor() {
      this.unreadCount = 0;
      this.setupEventListeners();
      this.pollNotifications();
    }
  
    async pollNotifications() {
      try {
        const response = await fetch('/api/notifications');
        const notifications = await response.json();
        this.updateUI(notifications);
        setTimeout(() => this.pollNotifications(), 30000);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    }
  
    updateUI(notifications) {
      this.unreadCount = notifications.filter(n => !n.read).length;
      document.getElementById('notification-count').textContent = this.unreadCount;
      
      const list = document.getElementById('notification-list');
      list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif._id}">
          <div class="notification-type ${notif.type}"></div>
          <div class="notification-content">
            <h5>${notif.title}</h5>
            <p>${notif.message}</p>
            <small>${new Date(notif.createdAt).toLocaleString()}</small>
          </div>
        </div>
      `).join('');
    }
  }
  
  new NotificationCenter();