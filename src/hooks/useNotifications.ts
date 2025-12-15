import { useState, useEffect, useCallback } from 'react';
import { Habit } from '@/lib/types';
import { toast } from 'sonner';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [scheduledNotifications, setScheduledNotifications] = useState<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifications enabled!');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied');
        return false;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  };

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  }, [permission]);

  const scheduleHabitReminders = useCallback((habits: Habit[]) => {
    // Clear existing scheduled notifications
    scheduledNotifications.forEach(timeout => clearTimeout(timeout));
    setScheduledNotifications(new Map());

    if (permission !== 'granted') return;

    const now = new Date();
    const newScheduled = new Map<string, NodeJS.Timeout>();

    habits.forEach(habit => {
      if (!habit.reminder_enabled || !habit.reminder_time) return;

      const [hours, minutes] = habit.reminder_time.split(':').map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (reminderDate <= now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }

      const msUntilReminder = reminderDate.getTime() - now.getTime();

      // Only schedule if within 24 hours
      if (msUntilReminder <= 24 * 60 * 60 * 1000) {
        const timeout = setTimeout(() => {
          sendNotification(`Time for: ${habit.title}`, {
            body: habit.description || 'Don\'t forget to complete your habit!',
            tag: habit.id,
          });
        }, msUntilReminder);

        newScheduled.set(habit.id, timeout);
      }
    });

    setScheduledNotifications(newScheduled);
  }, [permission, sendNotification]);

  const testNotification = () => {
    if (permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }
    sendNotification('Test Notification', {
      body: 'Notifications are working correctly!',
    });
  };

  return {
    permission,
    requestPermission,
    sendNotification,
    scheduleHabitReminders,
    testNotification,
  };
}
