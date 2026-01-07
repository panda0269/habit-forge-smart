
-- Drop and recreate the leaderboard function with avatar_url
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_habits bigint,
  total_completions bigint,
  best_streak integer,
  avg_completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.display_name, split_part(p.email, '@', 1)) as display_name,
    p.avatar_url,
    COUNT(DISTINCT h.id) as total_habits,
    COUNT(DISTINCT hl.id) as total_completions,
    COALESCE(
      (
        SELECT MAX(streak_count)
        FROM (
          SELECT 
            h2.id as habit_id,
            COUNT(*) as streak_count
          FROM habits h2
          JOIN habit_logs hl2 ON h2.id = hl2.habit_id
          WHERE h2.user_id = p.id
            AND hl2.completed = true
            AND hl2.completed_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY h2.id
        ) streaks
      ), 0
    )::integer as best_streak,
    CASE 
      WHEN COUNT(DISTINCT h.id) > 0 THEN 
        ROUND(
          (COUNT(DISTINCT hl.id)::numeric / 
          (COUNT(DISTINCT h.id) * 30)) * 100, 1
        )
      ELSE 0 
    END as avg_completion_rate
  FROM profiles p
  LEFT JOIN habits h ON p.id = h.user_id
  LEFT JOIN habit_logs hl ON h.id = hl.habit_id 
    AND hl.completed = true 
    AND hl.completed_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY p.id, p.display_name, p.email, p.avatar_url
  HAVING COUNT(DISTINCT h.id) > 0
  ORDER BY total_completions DESC, best_streak DESC
  LIMIT 50;
END;
$$;
