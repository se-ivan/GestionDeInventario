-- Hotfix seguro para producción: crear tabla libros_del_mes sin resetear base de datos
-- Ejecutar en ventana de mantenimiento y con backup previo.

BEGIN;

CREATE TABLE IF NOT EXISTS public.libros_del_mes (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT NULL,
  autor TEXT NULL,
  categoria TEXT NOT NULL DEFAULT 'RECOMENDACION',
  calificacion DOUBLE PRECISION NULL,
  resenas INTEGER NULL,
  portada_url TEXT NULL,
  isbn TEXT NULL,
  google_volume_id TEXT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  book_id INTEGER NULL,
  created_by_id INTEGER NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'libros_del_mes_book_id_fkey'
  ) THEN
    ALTER TABLE public.libros_del_mes
      ADD CONSTRAINT libros_del_mes_book_id_fkey
      FOREIGN KEY (book_id) REFERENCES public.books(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'libros_del_mes_created_by_id_fkey'
  ) THEN
    ALTER TABLE public.libros_del_mes
      ADD CONSTRAINT libros_del_mes_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES public.users(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS libros_del_mes_activo_idx ON public.libros_del_mes (activo);
CREATE INDEX IF NOT EXISTS libros_del_mes_categoria_idx ON public.libros_del_mes (categoria);
CREATE INDEX IF NOT EXISTS libros_del_mes_book_id_idx ON public.libros_del_mes (book_id);

COMMIT;
