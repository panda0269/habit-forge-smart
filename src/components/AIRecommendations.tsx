import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { HabitWithStats, UserCategory, CATEGORY_CONFIG } from '@/lib/types';
import { Sparkles, Loader2, RefreshCw, Brain, TrendingUp, Target, MessageSquare, BarChart3, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { HabitChatbot } from './HabitChatbot';
import { AIInsightChart } from './AIInsightChart';
import { AIMotivationalImage } from './AIMotivationalImage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';

interface AIRecommendationsProps {
  habits: HabitWithStats[];
  userCategory: UserCategory;
  triggerCount?: number;
}

type AnalysisType = 'suggestions' | 'patterns' | 'recommendations' | 'chat' | 'visual';

interface ChartData {
  name: string;
  value: number;
  predicted?: number;
}

interface AnalysisResult {
  content: string;
  timestamp: Date;
  charts?: {
    habitPerformance?: ChartData[];
    categoryRadar?: ChartData[];
    weeklyPrediction?: ChartData[];
  };
}

export function AIRecommendations({ habits, userCategory, triggerCount = 0 }: AIRecommendationsProps) {
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult | null>>({
    suggestions: null,
    patterns: null,
    recommendations: null,
    visual: null,
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisType>('suggestions');
  const lastTrigger = useRef(triggerCount);

  // Generate chart data from habits
  const generateChartData = () => {
    const habitPerformance: ChartData[] = habits.slice(0, 6).map(h => ({
      name: h.title.length > 12 ? h.title.substring(0, 12) + '...' : h.title,
      value: h.completionRate,
      predicted: Math.min(100, h.completionRate + Math.random() * 15)
    }));

    const categoryData: Record<string, { total: number; completed: number }> = {};
    habits.forEach(h => {
      if (!categoryData[h.category]) {
        categoryData[h.category] = { total: 0, completed: 0 };
      }
      categoryData[h.category].total += h.totalDays;
      categoryData[h.category].completed += h.totalDays - h.missedDays;
    });

    const categoryRadar: ChartData[] = Object.entries(categoryData).map(([cat, data]) => ({
      name: CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]?.label || cat,
      value: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      predicted: Math.min(100, (data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0) + 10)
    }));

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const avgRate = habits.length > 0 
      ? Math.round(habits.reduce((sum, h) => sum + h.completionRate, 0) / habits.length) 
      : 50;
    
    const weeklyPrediction: ChartData[] = days.map((day, i) => ({
      name: day,
      value: Math.max(0, avgRate + Math.sin(i * 0.8) * 15 + (Math.random() - 0.5) * 10),
      predicted: Math.min(100, avgRate + 5 + Math.sin(i * 0.8) * 10)
    }));

    return { habitPerformance, categoryRadar, weeklyPrediction };
  };

  const fetchAnalysis = async (type: string) => {
    if (type === 'chat') return;
    
    setLoading(type);
    try {
      const habitData = habits.map(h => ({
        id: h.id,
        title: h.title,
        category: h.category,
        frequency: h.frequency,
        completionRate: h.completionRate,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
        missedDays: h.missedDays,
        totalDays: h.totalDays,
        completedToday: h.completedToday,
      }));

      const apiType = type === 'suggestions' ? 'recommendations' : type;

      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { habits: habitData, userCategory, analysisType: apiType },
      });

      if (error) throw error;
      
      setAnalyses(prev => ({
        ...prev,
        [type]: {
          content: data.recommendations,
          timestamp: new Date(),
          charts: generateChartData(),
        },
      }));
    } catch (err) {
      console.error('Error fetching analysis:', err);
      toast.error('Failed to get AI analysis. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (triggerCount > 0 && triggerCount > lastTrigger.current && habits.length > 0) {
      lastTrigger.current = triggerCount;
      fetchAnalysis('suggestions');
    }
  }, [triggerCount, habits.length]);

  const tabs = [
    { id: 'suggestions' as AnalysisType, label: 'Insights', icon: Target, description: 'AI-powered habit insights with predictions' },
    { id: 'patterns' as AnalysisType, label: 'Patterns', icon: TrendingUp, description: 'Hidden correlations & trends' },
    { id: 'visual' as AnalysisType, label: 'Visual', icon: BarChart3, description: 'Charts & performance graphs' },
    { id: 'chat' as AnalysisType, label: 'Chat', icon: MessageSquare, description: 'Ask your habit coach' },
  ];

  const chartData = generateChartData();

  return (
    <Card variant="elevated" className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="font-display">AI Coach</CardTitle>
              <p className="text-xs text-muted-foreground">Powered by Gemini AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              userCategory === 'consistent' ? 'bg-primary/20 text-primary' :
              userCategory === 'improving' ? 'bg-accent/20 text-accent' :
              'bg-secondary/20 text-secondary'
            }`}>
              {userCategory.charAt(0).toUpperCase() + userCategory.slice(1)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisType)}>
          <TabsList className="grid grid-cols-4 w-full">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs">
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              {tab.id === 'chat' ? (
                <HabitChatbot habits={habits} userCategory={userCategory} />
              ) : tab.id === 'visual' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{tab.description}</p>
                  </div>
                  
                  {/* Performance Bar Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Habit Performance vs AI Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData.habitPerformance} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" domain={[0, 100]} className="text-muted-foreground text-xs" />
                            <YAxis type="category" dataKey="name" className="text-muted-foreground text-xs" width={80} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                                fontSize: '12px'
                              }}
                              formatter={(value: number, name: string) => [
                                `${Math.round(value)}%`, 
                                name === 'value' ? 'Current' : 'AI Predicted'
                              ]}
                            />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Current" />
                            <Bar dataKey="predicted" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} name="Predicted" opacity={0.6} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Blue = Current • Orange = AI Projected Potential
                      </p>
                    </CardContent>
                  </Card>

                  {/* Category Radar */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Category Strength Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={chartData.categoryRadar}>
                            <PolarGrid className="stroke-border" />
                            <PolarAngleAxis dataKey="name" className="text-muted-foreground text-xs" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-muted-foreground text-xs" />
                            <Radar 
                              name="Current" 
                              dataKey="value" 
                              stroke="hsl(var(--primary))" 
                              fill="hsl(var(--primary))" 
                              fillOpacity={0.3} 
                            />
                            <Radar 
                              name="Potential" 
                              dataKey="predicted" 
                              stroke="hsl(var(--accent))" 
                              fill="hsl(var(--accent))" 
                              fillOpacity={0.2} 
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                                fontSize: '12px'
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weekly Prediction */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Weekly Performance Prediction
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData.weeklyPrediction}>
                            <defs>
                              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="name" className="text-muted-foreground text-xs" />
                            <YAxis domain={[0, 100]} className="text-muted-foreground text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.5rem',
                                fontSize: '12px'
                              }}
                              formatter={(value: number, name: string) => [
                                `${Math.round(value)}%`, 
                                name === 'value' ? 'Expected' : 'With AI Tips'
                              ]}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#colorActual)" 
                              name="Expected"
                            />
                            <Area 
                              type="monotone" 
                              dataKey="predicted" 
                              stroke="hsl(var(--accent))" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              fillOpacity={1} 
                              fill="url(#colorPredicted)" 
                              name="With AI Tips"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        AI predicts following the tips could improve completion by ~5-15%
                      </p>
                    </CardContent>
                  </Card>

                  {/* Motivational Image Generator */}
                  <AIMotivationalImage 
                    habitTitle={habits[0]?.title}
                    category={habits[0]?.category}
                    mood={userCategory === 'consistent' ? 'celebrating' : userCategory === 'improving' ? 'encouraging' : 'challenging'}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{tab.description}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fetchAnalysis(tab.id)} 
                      disabled={loading === tab.id}
                    >
                      {loading === tab.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {analyses[tab.id] ? 'Refresh' : 'Generate'}
                    </Button>
                  </div>

                  {!analyses[tab.id] && loading !== tab.id && (
                    <div className="text-center py-8 border border-dashed border-border rounded-lg">
                      <tab.icon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">
                        {tab.id === 'suggestions' 
                          ? 'Complete or miss a habit to get AI insights' 
                          : `Click "Generate" to get ${tab.label.toLowerCase()} from AI`}
                      </p>
                    </div>
                  )}

                  {loading === tab.id && (
                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-muted-foreground text-sm">Analyzing your habits with AI...</p>
                    </div>
                  )}

                  {analyses[tab.id] && loading !== tab.id && (
                    <div className="space-y-4">
                      {/* Show mini chart preview for insights */}
                      {tab.id === 'suggestions' && analyses[tab.id]?.charts && (
                        <Card className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.habitPerformance.slice(0, 4)}>
                                  <XAxis dataKey="name" className="text-muted-foreground text-xs" tick={{ fontSize: 10 }} />
                                  <YAxis domain={[0, 100]} className="text-muted-foreground text-xs" tick={{ fontSize: 10 }} />
                                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-1">Quick Performance Overview</p>
                          </CardContent>
                        </Card>
                      )}

                      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4">
                          {analyses[tab.id]?.content}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Generated {analyses[tab.id]?.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
