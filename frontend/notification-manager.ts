export class NotificationManager {
    getNotifications() {
        return Promise.resolve([]);
    }
}

export const notificationManager = new NotificationManager();
