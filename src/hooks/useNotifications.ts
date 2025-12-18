import { useState, useEffect, useCallback, useRef } from 'react';
import { Habit } from '@/lib/types';
import { toast } from 'sonner';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const scheduledTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledTimeouts.current.forEach(timeout => clearTimeout(timeout));
      scheduledTimeouts.current.clear();
    };
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
        toast.error('Notification permission denied. Please enable in browser settings.');
        return false;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      toast.error('Failed to request notification permission');
      return false;
    }
  };

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (err) {
      console.error('Error sending notification:', err);
      return null;
    }
  }, [permission]);

  const scheduleHabitReminders = useCallback((habits: Habit[]) => {
    // Clear existing scheduled notifications
    scheduledTimeouts.current.forEach(timeout => clearTimeout(timeout));
    scheduledTimeouts.current.clear();

    if (permission !== 'granted') {
      console.log('Notification permission not granted, skipping reminders');
      return;
    }

    const now = new Date();

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
      if (msUntilReminder <= 24 * 60 * 60 * 1000 && msUntilReminder > 0) {
        console.log(`Scheduling reminder for "${habit.title}" in ${Math.round(msUntilReminder / 60000)} minutes`);
        
        const timeout = setTimeout(() => {
          sendNotification(`Time for: ${habit.title}`, {
            body: habit.description || 'Don\'t forget to complete your habit!',
            tag: habit.id,
          });
        }, msUntilReminder);

        scheduledTimeouts.current.set(habit.id, timeout);
      }
    });

    console.log(`Scheduled ${scheduledTimeouts.current.size} habit reminders`);
  }, [permission, sendNotification]);

  const testNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }
    
    const notification = sendNotification('Test Notification', {
      body: 'Notifications are working correctly! 🎉',
    });
    
    if (notification) {
      toast.success('Test notification sent!');
    }
  }, [permission, sendNotification]);

  return {
    permission,
    requestPermission,
    sendNotification,
    scheduleHabitReminders,
    testNotification,
    isSupported: 'Notification' in window,
  };
}
