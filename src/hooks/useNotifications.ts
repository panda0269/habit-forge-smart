import { useState, useCallback, useEffect } from 'react';

type NotificationPermission = 'default' | 'denied' | 'granted';

interface HabitForReminder {
  id: string;
  title: string;
  reminder_enabled?: boolean;
  reminder_time?: string | null;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      return null;
    }

    try {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }, [isSupported, permission]);

  const scheduleHabitReminders = useCallback((habits: HabitForReminder[]) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    // Filter habits with reminders enabled
    const habitsWithReminders = habits.filter(h => h.reminder_enabled && h.reminder_time);
    
    if (habitsWithReminders.length === 0) {
      return;
    }

    // For now, we just log - actual scheduling would need service workers
    // which are more complex to implement without a backend service
    console.log(`${habitsWithReminders.length} habits have reminders enabled`);
    
    // In a production app, you would:
    // 1. Register a service worker
    // 2. Use the Push API for server-triggered notifications
    // 3. Or use the Notification API with setTimeout for client-side scheduling
    
    // Simple example: schedule notifications for today
    const now = new Date();
    habitsWithReminders.forEach(habit => {
      if (!habit.reminder_time) return;
      
      const [hours, minutes] = habit.reminder_time.split(':').map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, don't schedule
      if (reminderDate <= now) return;
      
      const delay = reminderDate.getTime() - now.getTime();
      
      // Only schedule if within 24 hours
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          sendNotification(`Time for: ${habit.title}`, {
            body: 'Don\'t forget to complete your habit!',
            tag: `habit-${habit.id}`,
          });
        }, delay);
      }
    });
  }, [isSupported, permission, sendNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleHabitReminders,
  };
}
