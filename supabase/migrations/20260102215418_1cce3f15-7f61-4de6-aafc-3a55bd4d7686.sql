-- Create table to store Google Fit sync data
CREATE TABLE public.google_fit_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER DEFAULT 0,
  calories INTEGER DEFAULT 0,
  activity_segments INTEGER DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sync_date)
);

-- Enable RLS
ALTER TABLE public.google_fit_data ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own fitness data"
ON public.google_fit_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness data"
ON public.google_fit_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness data"
ON public.google_fit_data FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_google_fit_data_updated_at
BEFORE UPDATE ON public.google_fit_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();