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
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (geminiKey) {
      const response = await callGeminiRecommendations(habits, userCategory, analysisType, geminiKey);
      return res.json({ recommendations: response });
    }

    if (openaiKey) {
      const response = await callOpenAIRecommendations(habits, userCategory, analysisType, openaiKey);
      return res.json({ recommendations: response });
    }

    // Fallback when no API key is configured
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

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (geminiKey) {
      const response = await callGeminiChat(message, habitContext, conversationHistory, userCategory, geminiKey);
      return res.json({ reply: response });
    }

    if (openaiKey) {
      const response = await callOpenAIChat(message, habitContext, conversationHistory, userCategory, openaiKey);
      return res.json({ reply: response });
    }

    // Fallback when no API key is configured
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

// POST /api/ai/generate-image - Generate motivational image
router.post('/generate-image', auth, async (req, res) => {
  try {
    const { prompt, style } = req.body;

    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (openaiKey) {
      const imageUrl = await generateImageWithOpenAI(prompt, style, openaiKey);
      return res.json({ imageUrl, generated: true });
    }

    // Fallback: return placeholder image info
    res.json({
      imageUrl: null,
      generated: false,
      message: 'Image generation requires an OpenAI API key. Configure OPENAI_API_KEY in your .env file.',
      fallbackPrompt: prompt
    });
  } catch (error) {
    console.error('AI image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI API Integration Functions
// ============================================

async function callGeminiRecommendations(habits, userCategory, analysisType, apiKey) {
  try {
    const habitSummary = habits.map(h => ({
      title: h.title,
      category: h.category,
      completionRate: h.completionRate,
      currentStreak: h.currentStreak,
      longestStreak: h.longestStreak
    }));

    const prompt = `You are an expert habit coach. Analyze these habits and provide personalized recommendations.

User Category: ${userCategory} (consistent = 80%+ completion, improving = 50-80%, inconsistent = below 50%)
Analysis Type: ${analysisType || 'general'}

Habits:
${JSON.stringify(habitSummary, null, 2)}

Provide specific, actionable recommendations in a friendly, encouraging tone. Focus on:
1. What's working well
2. Areas for improvement
3. Specific strategies for the user's category
4. One micro-habit suggestion

Keep response under 300 words.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    return generateFallbackRecommendations(habits, userCategory, analysisType);
  } catch (error) {
    console.error('Gemini API error:', error);
    return generateFallbackRecommendations(habits, userCategory, analysisType);
  }
}

async function callOpenAIRecommendations(habits, userCategory, analysisType, apiKey) {
  try {
    const habitSummary = habits.map(h => ({
      title: h.title,
      category: h.category,
      completionRate: h.completionRate,
      currentStreak: h.currentStreak
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert habit coach. Provide personalized, actionable recommendations in a friendly, encouraging tone.'
          },
          {
            role: 'user',
            content: `User Category: ${userCategory}. Habits: ${JSON.stringify(habitSummary)}. Provide specific recommendations.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    return generateFallbackRecommendations(habits, userCategory, analysisType);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return generateFallbackRecommendations(habits, userCategory, analysisType);
  }
}

async function callGeminiChat(message, habitContext, conversationHistory, userCategory, apiKey) {
  try {
    const systemPrompt = `You are Sage, a wise and encouraging habit coach. Help users build better habits with practical advice and motivation.

User's habit context: ${JSON.stringify(habitContext || {})}
User category: ${userCategory}

Recent conversation:
${(conversationHistory || []).slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}

Respond helpfully in under 150 words.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 300
        }
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    return generateFallbackChatResponse(message, habitContext, userCategory);
  } catch (error) {
    console.error('Gemini chat error:', error);
    return generateFallbackChatResponse(message, habitContext, userCategory);
  }
}

async function callOpenAIChat(message, habitContext, conversationHistory, userCategory, apiKey) {
  try {
    const messages = [
      {
        role: 'system',
        content: `You are Sage, a wise habit coach. User category: ${userCategory}. Context: ${JSON.stringify(habitContext || {})}`
      },
      ...(conversationHistory || []).slice(-4).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.8
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    return generateFallbackChatResponse(message, habitContext, userCategory);
  } catch (error) {
    console.error('OpenAI chat error:', error);
    return generateFallbackChatResponse(message, habitContext, userCategory);
  }
}

async function generateImageWithOpenAI(prompt, style, apiKey) {
  try {
    const enhancedPrompt = `${prompt}. Style: ${style || 'motivational, inspiring, minimalist design'}`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    const data = await response.json();
    
    if (data.data && data.data[0]?.url) {
      return data.data[0].url;
    }

    throw new Error('Failed to generate image');
  } catch (error) {
    console.error('OpenAI image generation error:', error);
    throw error;
  }
}

// ============================================
// Fallback Functions (No API Key)
// ============================================

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
  
  if (lowerMessage.includes('help') || lowerMessage.includes('tip') || lowerMessage.includes('advice')) {
    return "Here are my top habit-building tips: 1) Start incredibly small (2-minute versions), 2) Attach new habits to existing ones, 3) Design your environment for success, 4) Track your progress visually, 5) Reward yourself after each completion. What specific habit would you like help with? 🎯";
  }
  
  return "That's a great question! Building habits takes time and patience. Focus on consistency over perfection, make your habits small enough to never skip, and remember that every completed habit is a vote for the person you want to become. What specific habit would you like to work on? 🎯";
}

function generateAutomationSuggestions(habits, userCategory, currentTime, dayOfWeek) {
  const autoUpdates = [];
  const insights = [];

  // Analyze habits for automation suggestions
  if (habits && habits.length > 0) {
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

      if (habit.completionRate > 90 && habit.currentStreak > 14) {
        autoUpdates.push({
          habitId: habit.id,
          habitTitle: habit.title,
          action: 'challenge',
          reason: 'You\'ve mastered this habit! Consider increasing the difficulty.',
          severity: 'success'
        });
      }
    });
  }

  // Generate a micro habit suggestion
  const microHabit = {
    title: 'Take 3 deep breaths',
    duration: '30 seconds',
    relatedHabit: habits && habits[0]?.title || null,
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
    impactedHabits: habits ? habits.slice(0, 3).map(h => h.title) : [],
    confidence: 0.75
  };

  insights.push('Remember: consistency beats intensity.');
  insights.push('Small habits compound into big results over time.');
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    insights.push('Weekends are great for reviewing and planning your habits!');
  }

  return {
    autoUpdates,
    microHabit,
    systemDecision,
    insights
  };
}

module.exports = router;
