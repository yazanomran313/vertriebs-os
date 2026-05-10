-- Run this in your Supabase SQL editor (new project)

CREATE TABLE weekly_reviews (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  week_date  date NOT NULL,
  q1         text,
  q2         text,
  q3         text,
  q4         text,
  q5         text,
  ai_insight text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_date)
);

-- Row Level Security: everyone sees only their own data
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_reviews_select" ON weekly_reviews
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own_reviews_insert" ON weekly_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_reviews_update" ON weekly_reviews
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "own_reviews_delete" ON weekly_reviews
  FOR DELETE USING (user_id = auth.uid());
