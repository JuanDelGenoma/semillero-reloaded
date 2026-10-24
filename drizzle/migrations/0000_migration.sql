CREATE TABLE public.careers (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 3),
  club_id text NOT NULL,
  manager_name text NOT NULL,
  season integer NOT NULL,
  week integer NOT NULL,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.careers TO authenticated;
GRANT USAGE ON SEQUENCE public.careers_id_seq TO authenticated;
GRANT ALL ON public.careers TO service_role;
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own careers select" ON public.careers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own careers insert" ON public.careers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own careers update" ON public.careers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own careers delete" ON public.careers FOR DELETE TO authenticated USING (auth.uid() = user_id);