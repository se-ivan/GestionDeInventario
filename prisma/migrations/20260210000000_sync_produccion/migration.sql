-- CreateEnum
CREATE TYPE "public"."ArticleStatus" AS ENUM ('BORRADOR', 'PUBLICADO');

-- CreateTable
CREATE TABLE "public"."noticias" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "slug" TEXT,
    "excerpt" VARCHAR(280),
    "status" "public"."ArticleStatus" NOT NULL DEFAULT 'BORRADOR',
    "published_at" TIMESTAMP(3),

    CONSTRAINT "noticias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."libros_del_mes" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "autor" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'RECOMENDACION',
    "calificacion" DOUBLE PRECISION,
    "resenas" INTEGER,
    "portada_url" TEXT,
    "isbn" TEXT,
    "google_volume_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "book_id" INTEGER,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "libros_del_mes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "subject" VARCHAR(255),
    "html" TEXT NOT NULL,
    "design" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "libros_del_mes_activo_idx" ON "public"."libros_del_mes"("activo");

-- CreateIndex
CREATE INDEX "libros_del_mes_categoria_idx" ON "public"."libros_del_mes"("categoria");

-- CreateIndex
CREATE INDEX "libros_del_mes_book_id_idx" ON "public"."libros_del_mes"("book_id");

-- CreateIndex
CREATE INDEX "email_templates_created_at_idx" ON "public"."email_templates"("created_at");

-- CreateIndex
CREATE INDEX "email_templates_activo_idx" ON "public"."email_templates"("activo");

-- AddForeignKey
ALTER TABLE "public"."noticias" ADD CONSTRAINT "noticias_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."libros_del_mes" ADD CONSTRAINT "libros_del_mes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."libros_del_mes" ADD CONSTRAINT "libros_del_mes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
