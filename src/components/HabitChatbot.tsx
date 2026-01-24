import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { aiApi } from '@/lib/api';
import { HabitWithStats, UserCategory } from '@/lib/types';
import { Send, Loader2, Bot, User, Sparkles, Mic, MicOff, Volume2, VolumeX, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HabitChatbotProps {
  habits: HabitWithStats[];
  userCategory: UserCategory;
}

const STARTER_PROMPTS = [
  "How can I build better habits?",
  "Why do I keep missing my habits?",
  "Suggest a morning routine",
  "How do I stay motivated?",
];

export function HabitChatbot({ habits, userCategory }: HabitChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptRef = useRef<string>('');

  // Check if speech recognition is supported
  const isSpeechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Check if speech synthesis is supported
  const isTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isTtsSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Filter to English voices for better UX
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      const voicesToUse = englishVoices.length > 0 ? englishVoices : voices;
      setAvailableVoices(voicesToUse);
      
      // Set default voice (prefer natural-sounding ones)
      if (voicesToUse.length > 0 && selectedVoiceIndex === 0) {
        const preferredIndex = voicesToUse.findIndex(v => 
          v.name.includes('Samantha') || 
          v.name.includes('Google') || 
          v.name.includes('Natural')
        );
        if (preferredIndex !== -1) {
          setSelectedVoiceIndex(preferredIndex);
        }
      }
    };

    // Load voices immediately and on change
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isTtsSupported, selectedVoiceIndex]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Text-to-speech function
  const speakText = useCallback((text: string) => {
    if (!isTtsSupported || !ttsEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 1.0;

    // Use selected voice
    if (availableVoices.length > 0 && availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isTtsSupported, ttsEnabled, availableVoices, selectedVoiceIndex, speechRate, speechPitch]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (isTtsSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isTtsSupported]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const habitContext = habits.map(h => ({
        title: h.title,
        category: h.category,
        completionRate: h.completionRate,
        currentStreak: h.currentStreak,
        completedToday: h.completedToday,
      }));

      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const data = await aiApi.chat(messageText.trim(), habitContext, conversationHistory, userCategory);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      speakText(data.reply);
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Failed to send message. Please try again.');
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [habits, isLoading, messages, userCategory, speakText]);

  // Initialize speech recognition with auto-send on silence
  useEffect(() => {
    if (!isSpeechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setInput(transcript);
      pendingTranscriptRef.current = transcript;

      // Check if the last result is final
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal && transcript.trim()) {
        // Set a timeout to auto-send after 1.5 seconds of silence
        silenceTimeoutRef.current = setTimeout(() => {
          if (pendingTranscriptRef.current.trim()) {
            const textToSend = pendingTranscriptRef.current.trim();
            pendingTranscriptRef.current = '';
            setInput('');
            setIsListening(false);
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            sendMessage(textToSend);
          }
        }, 1500);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in your browser settings.');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast.error('Voice input error. Please try again.');
      }
    };

    recognitionRef.current.onend = () => {
      // Only reset if we're still supposed to be listening (handle unexpected stops)
      if (isListening && pendingTranscriptRef.current.trim()) {
        // Auto-send if there's pending text when recognition ends
        const textToSend = pendingTranscriptRef.current.trim();
        pendingTranscriptRef.current = '';
        setInput('');
        sendMessage(textToSend);
      }
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [isSpeechSupported, isListening, sendMessage]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in your browser.');
      return;
    }

    if (isListening) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      recognitionRef.current.stop();
      setIsListening(false);
      // If there's pending text, send it
      if (pendingTranscriptRef.current.trim()) {
        const textToSend = pendingTranscriptRef.current.trim();
        pendingTranscriptRef.current = '';
        setInput('');
        sendMessage(textToSend);
      }
    } else {
      // Stop any ongoing speech when starting to listen
      stopSpeaking();
      setInput('');
      pendingTranscriptRef.current = '';
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Listening... Will auto-send when you pause speaking.');
    }
  };

  const toggleTts = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setTtsEnabled(!ttsEnabled);
    toast.info(ttsEnabled ? 'Voice responses disabled' : 'Voice responses enabled');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const getVoiceDisplayName = (voice: SpeechSynthesisVoice) => {
    // Clean up voice name for display
    let name = voice.name;
    // Remove common prefixes
    name = name.replace(/^(Microsoft |Google |Apple )/i, '');
    // Add language indicator if not obvious
    if (!voice.lang.startsWith('en-US')) {
      name += ` (${voice.lang})`;
    }
    return name;
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex justify-end gap-2 mb-2">
        {isTtsSupported && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Voice Settings
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-popover border border-border z-50" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Voice</Label>
                    <Select
                      value={selectedVoiceIndex.toString()}
                      onValueChange={(value) => setSelectedVoiceIndex(parseInt(value))}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50 max-h-[200px]">
                        {availableVoices.map((voice, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {getVoiceDisplayName(voice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium">Speed</Label>
                      <span className="text-xs text-muted-foreground">{speechRate.toFixed(1)}x</span>
                    </div>
                    <Slider
                      value={[speechRate]}
                      onValueChange={(values) => setSpeechRate(values[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium">Pitch</Label>
                      <span className="text-xs text-muted-foreground">{speechPitch.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[speechPitch]}
                      onValueChange={(values) => setSpeechPitch(values[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => speakText("Hi, I'm Sage! This is how I sound.")}
                  >
                    <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                    Preview Voice
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleTts}
              className="text-xs gap-1.5"
            >
              {ttsEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Voice On
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  Voice Off
                </>
              )}
            </Button>
          </>
        )}
      </div>

      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 bg-muted/50 rounded-2xl rounded-tl-md px-4 py-3">
                  <p className="text-sm">
                    Hi! I'm Sage, your habit coach 🌟 Ask me anything about building better habits, 
                    staying motivated, or getting specific advice for your habits!
                    {isSpeechSupported && (
                      <span className="block mt-2 text-muted-foreground">
                        💡 Tip: Use the microphone button - I'll auto-send when you pause speaking!
                      </span>
                    )}
                    {isTtsSupported && (
                      <span className="block mt-1 text-muted-foreground">
                        🔊 I'll speak my responses aloud. Use Voice Settings to change my voice!
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="pl-11 space-y-2">
                <p className="text-xs text-muted-foreground">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-3"
                      onClick={() => sendMessage(prompt)}
                      disabled={isLoading}
                    >
                      <Sparkles className="w-3 h-3 mr-1.5" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-primary'
                      : 'bg-gradient-to-br from-primary to-accent'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div
                  className={`flex-1 max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-md'
                      : 'bg-muted/50 rounded-tl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className={`flex items-center gap-2 mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    <span className="text-xs">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.role === 'assistant' && isTtsSupported && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => speakText(message.content)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted/50 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {isSpeaking && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                <Volume2 className="w-3 h-3 animate-pulse" />
                <span>Speaking...</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1"
                  onClick={stopSpeaking}
                >
                  <VolumeX className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? "Listening... pause to auto-send" : "Ask about habit building..."}
          disabled={isLoading}
          className={`flex-1 ${isListening ? 'border-primary bg-primary/5' : ''}`}
        />
        {isSpeechSupported && (
          <Button 
            type="button" 
            size="icon" 
            variant={isListening ? "default" : "outline"}
            onClick={toggleListening}
            disabled={isLoading}
            className={isListening ? 'animate-pulse' : ''}
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
