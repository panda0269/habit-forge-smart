import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIMotivationalImageProps {
  habitTitle?: string;
  category?: string;
  mood?: 'encouraging' | 'celebrating' | 'challenging';
}

export function AIMotivationalImage({ habitTitle, category, mood = 'encouraging' }: AIMotivationalImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-image', {
        body: { habitTitle, category, mood },
      });

      if (error) throw error;
      
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        toast.error('Failed to generate image');
      }
    } catch (err) {
      console.error('Image generation error:', err);
      toast.error('Failed to generate motivational image');
    } finally {
      setLoading(false);
    }
  };

  if (!imageUrl) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-medium mb-2">AI Motivation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate a personalized motivational image for your habits
          </p>
          <Button onClick={generateImage} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video">
        <img 
          src={imageUrl} 
          alt="AI generated motivational image" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-white text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            AI Generated
          </span>
          <Button 
            size="sm" 
            variant="secondary" 
            className="h-7 px-2 text-xs"
            onClick={generateImage}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
