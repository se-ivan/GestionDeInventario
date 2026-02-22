-- Hotfix seguro para producción: crear tabla email_templates sin resetear base de datos

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_templates (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  subject VARCHAR(255) NULL,
  html TEXT NOT NULL,
  design JSONB NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_id INTEGER NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_templates_created_by_id_fkey'
  ) THEN
    ALTER TABLE public.email_templates
      ADD CONSTRAINT email_templates_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES public.users(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS email_templates_created_at_idx ON public.email_templates (created_at);
CREATE INDEX IF NOT EXISTS email_templates_activo_idx ON public.email_templates (activo);

COMMIT;
