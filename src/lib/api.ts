const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('[API] VITE_API_URL from env:', import.meta.env.VITE_API_URL);
console.log('[API] Using API_URL:', API_URL);

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('habitforge_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('habitforge_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('habitforge_token');
};

// API request helper
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Check if response is HTML (usually means route not found or server error)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Backend server is not available. Please ensure the backend is running.');
      }
      
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to backend server. Please ensure the backend is running at ' + API_URL);
    }
    throw error;
  }
};

// File upload helper
export const uploadFile = async (
  endpoint: string,
  file: File,
  fieldName: string = 'file'
): Promise<any> => {
  const token = getToken();
  
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
};

// Auth-specific API functions
export const authApi = {
  register: async (email: string, password: string, displayName?: string) => {
    const data = await apiRequest<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    setToken(data.token);
    return data;
  },

  login: async (email: string, password: string) => {
    const data = await apiRequest<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  logout: () => {
    removeToken();
  },

  getMe: async () => {
    return apiRequest<{ user: any }>('/api/auth/me');
  },

  updateProfile: async (data: { displayName?: string; avatarUrl?: string }) => {
    return apiRequest<{ user: any }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAvatar: async (file: File) => {
    return uploadFile('/api/auth/upload-avatar', file, 'avatar');
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  forgotPassword: async (email: string) => {
    return apiRequest<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, newPassword: string) => {
    return apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

// Habits API
export const habitsApi = {
  getAll: async (userId: string) => {
    return apiRequest<any[]>(`/api/habits/${userId}`);
  },

  create: async (habitData: any) => {
    return apiRequest<any>('/api/habits', {
      method: 'POST',
      body: JSON.stringify(habitData),
    });
  },

  update: async (id: string, habitData: any) => {
    return apiRequest<any>(`/api/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(habitData),
    });
  },

  delete: async (id: string) => {
    return apiRequest<any>(`/api/habits/${id}`, {
      method: 'DELETE',
    });
  },
};

// Habit Logs API
export const habitLogsApi = {
  getByUser: async (userId: string) => {
    return apiRequest<any[]>(`/api/habit-logs/${userId}`);
  },

  getByHabit: async (habitId: string) => {
    return apiRequest<any[]>(`/api/habit-logs/habit/${habitId}`);
  },

  toggle: async (habitId: string, userId: string, date: string) => {
    return apiRequest<{ action: string; log: any }>('/api/habit-logs', {
      method: 'POST',
      body: JSON.stringify({ habitId, userId, date }),
    });
  },
};

// Stats API
export const statsApi = {
  getByUser: async (userId: string) => {
    return apiRequest<any>(`/api/stats/${userId}`);
  },

  getLeaderboard: async () => {
    return apiRequest<any[]>('/api/stats/leaderboard/all');
  },
};

// Rewards API
export const rewardsApi = {
  getUserRewards: async () => {
    return apiRequest<any>('/api/rewards/user');
  },

  addXP: async (amount: number) => {
    return apiRequest<any>('/api/rewards/xp', {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  },

  getAchievements: async () => {
    return apiRequest<any[]>('/api/rewards/achievements');
  },

  getUserAchievements: async () => {
    return apiRequest<any[]>('/api/rewards/user-achievements');
  },

  unlockAchievement: async (achievementId: string) => {
    return apiRequest<any>('/api/rewards/unlock-achievement', {
      method: 'POST',
      body: JSON.stringify({ achievementId }),
    });
  },

  getRedeemable: async () => {
    return apiRequest<any[]>('/api/rewards/redeemable');
  },

  getUserRedeemed: async () => {
    return apiRequest<any[]>('/api/rewards/user-redeemed');
  },

  redeem: async (rewardId: string) => {
    return apiRequest<any>('/api/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({ rewardId }),
    });
  },
};

// Reflections API
export const reflectionsApi = {
  get: async (weekStart: string) => {
    return apiRequest<any>(`/api/reflections/${weekStart}`);
  },

  save: async (data: {
    weekStart: string;
    whatWorked?: string;
    whatDidntWork?: string;
    nextWeekFocus?: string;
  }) => {
    return apiRequest<any>('/api/reflections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAll: async () => {
    return apiRequest<any[]>('/api/reflections');
  },
};

// Leaderboard API
export const leaderboardApi = {
  get: async () => {
    return apiRequest<any[]>('/api/leaderboard');
  },
};

// AI API
export const aiApi = {
  getRecommendations: async (habits: any[], userCategory: string, analysisType: string) => {
    return apiRequest<{ recommendations: string }>('/api/ai/recommendations', {
      method: 'POST',
      body: JSON.stringify({ habits, userCategory, analysisType }),
    });
  },

  chat: async (message: string, habitContext: any[], conversationHistory: any[], userCategory: string) => {
    return apiRequest<{ reply: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, habitContext, conversationHistory, userCategory }),
    });
  },

  getAutomation: async (habits: any[], userCategory: string, currentTime: string, dayOfWeek: number) => {
    return apiRequest<any>('/api/ai/automation', {
      method: 'POST',
      body: JSON.stringify({ habits, userCategory, currentTime, dayOfWeek }),
    });
  },
};

// Helper to get avatar URL with API base
export const getAvatarUrl = (avatarUrl: string | null | undefined): string | undefined => {
  if (!avatarUrl) return undefined;
  
  // If it's already an absolute URL or data URL, return as-is
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
    return avatarUrl;
  }
  
  // If it's a relative path, prepend API URL
  if (avatarUrl.startsWith('/uploads/')) {
    return `${API_URL}${avatarUrl}`;
  }
  
  return avatarUrl;
};

export { getToken, setToken, removeToken };
