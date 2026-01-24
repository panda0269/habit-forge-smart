const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Note: AI features require an API key to be configured
// Set GEMINI_API_KEY or OPENAI_API_KEY in your .env file

// POST /api/ai/recommendations - Get AI habit recommendations
router.post('/recommendations', auth, async (req, res) => {
  try {
    const { habits, userCategory, analysisType } = req.body;

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Return a helpful message if no API key is configured
      return res.json({
        recommendations: generateFallbackRecommendations(habits, userCategory, analysisType)
      });
    }

    // If using Gemini
    if (process.env.GEMINI_API_KEY) {
      const response = await callGeminiAPI(habits, userCategory, analysisType);
      return res.json({ recommendations: response });
    }

    // If using OpenAI
    if (process.env.OPENAI_API_KEY) {
      const response = await callOpenAIAPI(habits, userCategory, analysisType);
      return res.json({ recommendations: response });
    }

    res.json({
      recommendations: generateFallbackRecommendations(habits, userCategory, analysisType)
    });
  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/chat - Chat with habit coach
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, habitContext, conversationHistory, userCategory } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.json({
        reply: generateFallbackChatResponse(message, habitContext, userCategory)
      });
    }

    // Implement actual AI chat here when API key is available
    res.json({
      reply: generateFallbackChatResponse(message, habitContext, userCategory)
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/automation - Get habit automation suggestions
router.post('/automation', auth, async (req, res) => {
  try {
    const { habits, userCategory, currentTime, dayOfWeek } = req.body;

    // Generate automation suggestions
    const result = generateAutomationSuggestions(habits, userCategory, currentTime, dayOfWeek);
    res.json(result);
  } catch (error) {
    console.error('AI automation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback functions when no API key is configured

function generateFallbackRecommendations(habits, userCategory, analysisType) {
  if (!habits || habits.length === 0) {
    return "Start by creating your first habit! Small, consistent actions lead to big changes over time.";
  }

  const avgCompletion = habits.reduce((sum, h) => sum + (h.completionRate || 0), 0) / habits.length;
  const topHabit = habits.reduce((best, h) => (h.completionRate || 0) > (best.completionRate || 0) ? h : best, habits[0]);
  const strugglingHabit = habits.reduce((worst, h) => (h.completionRate || 0) < (worst.completionRate || 0) ? h : worst, habits[0]);

  let recommendations = [];

  if (userCategory === 'consistent') {
    recommendations.push("🌟 You're doing amazing! Your consistency is impressive.");
    recommendations.push(`Your strongest habit is "${topHabit.title}" - keep it up!`);
    recommendations.push("Consider adding a new challenging habit to continue growing.");
  } else if (userCategory === 'improving') {
    recommendations.push("📈 You're making progress! Keep building momentum.");
    recommendations.push(`Focus on improving "${strugglingHabit.title}" - try linking it to an existing routine.`);
    recommendations.push("Set specific times for your habits to build stronger triggers.");
  } else {
    recommendations.push("💪 Every day is a fresh start. Don't be too hard on yourself.");
    recommendations.push("Try focusing on just one or two habits until they become automatic.");
    recommendations.push("Start with smaller versions of your habits - make them impossible to fail.");
  }

  recommendations.push(`\n📊 Your average completion rate is ${Math.round(avgCompletion)}%.`);
  
  return recommendations.join("\n\n");
}

function generateFallbackChatResponse(message, habitContext, userCategory) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('motivation') || lowerMessage.includes('motivated')) {
    return "Motivation comes and goes, but habits stick! Focus on making your habits so small that you can't say no. When you don't feel motivated, that's exactly when showing up matters most. Even 1% progress is still progress! 💪";
  }
  
  if (lowerMessage.includes('miss') || lowerMessage.includes('skip') || lowerMessage.includes('fail')) {
    return "Missing a habit doesn't define you - it's what you do next that matters. Never miss twice in a row. If you slip, get back on track immediately. Progress isn't linear, and setbacks are part of the journey. You've got this! 🌟";
  }
  
  if (lowerMessage.includes('morning') || lowerMessage.includes('routine')) {
    return "A great morning routine starts the night before! Try: 1) Prepare everything you need, 2) Wake up at the same time daily, 3) Start with your most important habit before checking your phone, 4) Stack habits together for efficiency. Small wins in the morning create momentum for the whole day! ☀️";
  }
  
  if (lowerMessage.includes('streak') || lowerMessage.includes('consistent')) {
    return "Building streaks is powerful! Try these tips: 1) Never miss twice in a row, 2) Do your habits at the same time each day, 3) Use habit stacking (after X, I will Y), 4) Make it obvious - put visual reminders everywhere, 5) Celebrate small wins! 🔥";
  }
  
  return "That's a great question! Building habits takes time and patience. Focus on consistency over perfection, make your habits small enough to never skip, and remember that every completed habit is a vote for the person you want to become. What specific habit would you like to work on? 🎯";
}

function generateAutomationSuggestions(habits, userCategory, currentTime, dayOfWeek) {
  const autoUpdates = [];
  const insights = [];

  // Analyze habits for automation suggestions
  habits.forEach(habit => {
    if (habit.completionRate < 30) {
      autoUpdates.push({
        habitId: habit.id,
        habitTitle: habit.title,
        action: 'simplify',
        reason: 'Low completion rate suggests this habit might be too ambitious',
        severity: 'warning'
      });
    }
    
    if (habit.currentStreak === 0 && habit.longestStreak > 7) {
      autoUpdates.push({
        habitId: habit.id,
        habitTitle: habit.title,
        action: 'encourage',
        reason: 'You had a great streak going! Time to restart.',
        severity: 'info'
      });
    }
  });

  // Generate a micro habit suggestion
  const microHabit = {
    title: 'Take 3 deep breaths',
    duration: '30 seconds',
    relatedHabit: habits[0]?.title || null,
    actionSteps: ['Breathe in for 4 seconds', 'Hold for 4 seconds', 'Breathe out for 4 seconds'],
    bestTime: 'When you wake up',
    motivation: 'Start your day with clarity and calm'
  };

  // System decision
  const systemDecision = {
    decision: userCategory === 'consistent' ? 'Maintain current routine' : 'Focus on core habits',
    reasoning: userCategory === 'consistent' 
      ? 'Your habits are on track. Keep the momentum going!'
      : 'Simplify your routine to build consistency first.',
    impactedHabits: habits.slice(0, 3).map(h => h.title),
    confidence: 0.75
  };

  insights.push('Remember: consistency beats intensity.');
  insights.push('Small habits compound into big results over time.');

  return {
    autoUpdates,
    microHabit,
    systemDecision,
    insights
  };
}

// Placeholder for actual API calls (implement when API keys are available)
async function callGeminiAPI(habits, userCategory, analysisType) {
  // Implement Gemini API call
  return generateFallbackRecommendations(habits, userCategory, analysisType);
}

async function callOpenAIAPI(habits, userCategory, analysisType) {
  // Implement OpenAI API call
  return generateFallbackRecommendations(habits, userCategory, analysisType);
}

module.exports = router;
