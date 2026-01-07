import { useState, useEffect, useCallback, useRef } from 'react';
import { Habit, HabitCategory } from '@/lib/types';
import { toast } from 'sonner';

// Funny notification messages by category
const FUNNY_MESSAGES: Record<HabitCategory, string[]> = {
  health: [
    "Your body is a temple... that needs maintenance! 🏛️",
    "Health is wealth, and you're about to get RICH! 💰",
    "Your future self is begging you to do this! 🙏",
    "Even sloths move sometimes. Your turn! 🦥",
    "Doctor's orders: Be awesome right now! 👨‍⚕️",
    "Your organs called. They want attention! 🫀",
  ],
  fitness: [
    "Those muscles won't flex themselves! 💪",
    "Sweat is just your fat crying. Make it cry! 😭",
    "Time to pretend you're in a training montage! 🎬",
    "Your couch misses you. DON'T GO BACK! 🛋️",
    "Warning: Looking too good might cause jealousy! 👀",
    "The gym equipment is lonely without you! 🏋️",
    "No pain, no gain. Actually, some pain, some gain! 😅",
  ],
  productivity: [
    "Procrastination called. It's been ghosted! 👻",
    "Your to-do list is judging you silently! 📝",
    "Future you will thank present you. Do it! ⏰",
    "Productivity mode: ACTIVATED! 🚀",
    "Time to adult. We believe in you! 🦸",
    "Your dreams aren't going to achieve themselves! ✨",
    "Coffee + You = Unstoppable! ☕",
  ],
  mindfulness: [
    "Your mind called. It wants some peace! 🧘",
    "Breathe in success, breathe out stress! 🌬️",
    "Inner peace loading... Please participate! ⏳",
    "Even your thoughts need a spa day! 🧖",
    "Namaste in bed? Nope, time to meditate! 🙏",
    "Your chakras are sending you a reminder! 🔮",
  ],
  learning: [
    "Your brain cells are ready for gains! 🧠",
    "Knowledge is power. Time to power up! ⚡",
    "Be the nerd you were born to be! 🤓",
    "Plot twist: You're about to get smarter! 📚",
    "Your IQ just sent a friend request! 🎓",
    "Einstein started somewhere. Your turn! 💡",
  ],
  social: [
    "Humans need humans. Time to human! 👥",
    "Your social skills are asking for exercise! 🗣️",
    "Connection loading... Please initiate! 💬",
    "Even introverts need their moment! 🌟",
    "Someone out there needs your energy! ❤️",
    "Friendship isn't a spectator sport! 🤝",
  ],
  other: [
    "This habit won't complete itself! Get moving! 🏃",
    "Your potential is calling. Please answer! 📞",
    "Champions do what others won't! 🏆",
    "Small steps, big results. Let's go! 👣",
    "You've got this! Prove us right! 💪",
    "Excuses don't burn calories (or build habits)! 🔥",
  ],
};

// Special time-based funny messages
const TIME_BASED_MESSAGES = {
  morning: [
    "Rise and grind! ☀️ (Coffee helps too)",
    "Good morning, superstar! Time to shine! 🌟",
    "The early bird gets the habit done! 🐦",
  ],
  evening: [
    "Evening check! How's that habit going? 🌙",
    "Before Netflix, there's this habit! 📺",
    "End the day strong! Almost there! 💪",
  ],
  night: [
    "Night owl mode activated! 🦉",
    "Before bed, one quick habit! 😴",
    "Finish this, then dream big! 🌌",
  ],
  sleep: [
    "Your pillow misses you! Time to sleep! 🛏️",
    "Counting sheep waiting for you! 🐑🐑🐑",
    "Dreams won't watch themselves! Go sleep! 💤",
    "Even superheroes need sleep. To bed! 🦸‍♂️😴",
    "Your bed is calling. Don't ghost it! 📱➡️🛏️",
    "Sleep: Loading tomorrow's energy... 🔋",
  ],
};

const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};

const getTimeOfDay = (): 'morning' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 20) return 'evening';
  return 'night';
};

const isSleepRelated = (title: string): boolean => {
  const sleepKeywords = ['sleep', 'bed', 'rest', 'nap', 'bedtime', 'night routine'];
  return sleepKeywords.some(keyword => title.toLowerCase().includes(keyword));
};

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
        toast.success('Notifications enabled! Get ready for some fun reminders! 🎉');
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

  const getFunnyMessage = useCallback((habit: Habit): string => {
    // Special handling for sleep-related habits
    if (isSleepRelated(habit.title)) {
      return getRandomMessage(TIME_BASED_MESSAGES.sleep);
    }

    // Mix category-specific with time-based messages
    const categoryMessages = FUNNY_MESSAGES[habit.category] || FUNNY_MESSAGES.other;
    const timeMessages = TIME_BASED_MESSAGES[getTimeOfDay()];
    
    // 70% chance for category-specific, 30% for time-based
    if (Math.random() > 0.3) {
      return getRandomMessage(categoryMessages);
    }
    return getRandomMessage(timeMessages);
  }, []);

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
          const funnyMessage = getFunnyMessage(habit);
          sendNotification(`⏰ ${habit.title}`, {
            body: funnyMessage,
            tag: habit.id,
          });
          
          // Also show a toast for in-app notification
          toast(habit.title, {
            description: funnyMessage,
            duration: 10000,
            action: {
              label: "Let's go!",
              onClick: () => window.focus(),
            },
          });
        }, msUntilReminder);

        scheduledTimeouts.current.set(habit.id, timeout);
      }
    });

    console.log(`Scheduled ${scheduledTimeouts.current.size} habit reminders`);
  }, [permission, sendNotification, getFunnyMessage]);

  const testNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }
    
    const funnyTestMessages = [
      "🔔 Ding ding! This is what motivation sounds like!",
      "👋 Hey there, champion! Notifications work!",
      "🎉 Woohoo! You'll never miss a habit again!",
      "🚀 Houston, notifications are GO!",
      "✨ Magic! Your reminders will be legendary!",
    ];
    
    const message = getRandomMessage(funnyTestMessages);
    
    const notification = sendNotification('Test Notification', {
      body: message,
    });
    
    if (notification) {
      toast.success(message);
    }
  }, [permission, sendNotification]);

  // Send motivational toast messages randomly throughout the day
  const sendMotivationalToast = useCallback(() => {
    const motivationalMessages = [
      { title: "You're crushing it! 🔥", desc: "Keep up the amazing work!" },
      { title: "Habit hero! 🦸", desc: "Your consistency is inspiring!" },
      { title: "Progress check! 📈", desc: "Every day you're getting better!" },
      { title: "Pro tip! 💡", desc: "Small habits lead to big changes!" },
      { title: "You rock! 🎸", desc: "Your dedication is paying off!" },
    ];
    
    const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
    toast(msg.title, { description: msg.desc, duration: 5000 });
  }, []);

  return {
    permission,
    requestPermission,
    sendNotification,
    scheduleHabitReminders,
    testNotification,
    sendMotivationalToast,
    isSupported: 'Notification' in window,
  };
}
