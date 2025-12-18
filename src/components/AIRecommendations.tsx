import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { HabitWithStats, UserCategory } from '@/lib/types';
import { Sparkles, Loader2, RefreshCw, Brain, TrendingUp, Target, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { HabitChatbot } from './HabitChatbot';

interface AIRecommendationsProps {
  habits: HabitWithStats[];
  userCategory: UserCategory;
  triggerCount?: number;
}

type AnalysisType = 'suggestions' | 'patterns' | 'recommendations' | 'chat';

interface AnalysisResult {
  content: string;
  timestamp: Date;
}

export function AIRecommendations({ habits, userCategory, triggerCount = 0 }: AIRecommendationsProps) {
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult | null>>({
    suggestions: null,
    patterns: null,
    recommendations: null,
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisType>('suggestions');
  const lastTrigger = useRef(triggerCount);
  const hasFetchedInitial = useRef(false);

  const fetchAnalysis = async (type: string) => {
    if (type === 'chat') return; // Chat is handled separately
    
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
        },
      }));
    } catch (err) {
      console.error('Error fetching analysis:', err);
      toast.error('Failed to get AI analysis. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  // Auto-fetch suggestions on initial load
  useEffect(() => {
    if (!hasFetchedInitial.current && habits.length > 0) {
      hasFetchedInitial.current = true;
      fetchAnalysis('suggestions');
    }
  }, [habits.length]);

  // Auto-fetch suggestions when triggerCount changes
  useEffect(() => {
    if (triggerCount > lastTrigger.current && habits.length > 0) {
      lastTrigger.current = triggerCount;
      fetchAnalysis('suggestions');
    }
  }, [triggerCount, habits.length]);

  const tabs = [
    { id: 'suggestions' as AnalysisType, label: 'Suggestions', icon: Target, description: 'Smart tips for your habits' },
    { id: 'patterns' as AnalysisType, label: 'Patterns', icon: TrendingUp, description: 'Hidden correlations' },
    { id: 'recommendations' as AnalysisType, label: 'Actions', icon: Brain, description: 'Personalized action items' },
    { id: 'chat' as AnalysisType, label: 'Chat', icon: MessageSquare, description: 'Ask your habit coach' },
  ];

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
              <p className="text-xs text-muted-foreground">Powered by Lovable AI</p>
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
                        {tab.id === 'suggestions' ? 'Loading suggestions...' : `Click "Generate" to get ${tab.label.toLowerCase()} from AI`}
                      </p>
                    </div>
                  )}

                  {loading === tab.id && (
                    <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border rounded-lg">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-muted-foreground text-sm">Analyzing your habits...</p>
                    </div>
                  )}

                  {analyses[tab.id] && loading !== tab.id && (
                    <div className="space-y-3">
                      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
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
