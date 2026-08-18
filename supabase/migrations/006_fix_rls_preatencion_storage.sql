-- ============================================================
-- MIGRACIÓN 006: Fix RLS + Storage para Portal Pre-Atención
-- Permite que pacientes anónimos (sin cuenta) puedan insertar
-- datos en solicitudes_preatencion y subir archivos al bucket
-- biometria_pacientes desde el portal /pre-atencion público.
-- Compatible con Supabase SQL Editor (idempotente).
-- ============================================================

-- ============================================================
-- 1. TABLA solicitudes_preatencion
--    Verificar y re-crear política pública si fue eliminada
-- ============================================================

-- Asegurar que RLS esté habilitado
ALTER TABLE solicitudes_preatencion ENABLE ROW LEVEL SECURITY;

-- Eliminar política vieja si existe (para recrearla correctamente)
DROP POLICY IF EXISTS "Acceso público solicitudes preatencion" ON solicitudes_preatencion;
DROP POLICY IF EXISTS "anon puede insertar solicitudes" ON solicitudes_preatencion;
DROP POLICY IF EXISTS "authenticated puede leer solicitudes" ON solicitudes_preatencion;

-- Política: usuarios anónimos pueden INSERTAR (formulario del paciente)
CREATE POLICY "anon puede insertar solicitudes"
ON solicitudes_preatencion FOR INSERT
TO anon
WITH CHECK (true);

-- Política: usuarios autenticados (la doctora) pueden leer, actualizar y eliminar
CREATE POLICY "authenticated puede gestionar solicitudes"
ON solicitudes_preatencion FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- 2. STORAGE BUCKET: biometria_pacientes
--    Crear bucket si no existe y agregar políticas para anon
-- ============================================================

-- Crear el bucket si no existe (configurado como público para facilitar acceso)
INSERT INTO storage.buckets (id, name, public)
VALUES ('biometria_pacientes', 'biometria_pacientes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Eliminar políticas de storage anteriores (para recrearlas limpias)
DROP POLICY IF EXISTS "anon puede subir biometria" ON storage.objects;
DROP POLICY IF EXISTS "public puede leer biometria" ON storage.objects;
DROP POLICY IF EXISTS "authenticated puede gestionar biometria" ON storage.objects;

-- Política: usuarios anónimos pueden SUBIR archivos al bucket biometria_pacientes
CREATE POLICY "anon puede subir biometria"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'biometria_pacientes');

-- Política: lectura pública de archivos del bucket
CREATE POLICY "public puede leer biometria"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'biometria_pacientes');

-- Política: la doctora (authenticated) puede gestionar todos los archivos
CREATE POLICY "authenticated puede gestionar biometria"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'biometria_pacientes')
WITH CHECK (bucket_id = 'biometria_pacientes');

-- ============================================================
-- 3. STORAGE BUCKET: pre_atencion_telemedicina
--    Asegurar que este bucket también tenga las políticas correctas
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('pre_atencion_telemedicina', 'pre_atencion_telemedicina', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "anon puede subir preatencion" ON storage.objects;

CREATE POLICY "anon puede subir preatencion"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'pre_atencion_telemedicina');

-- ============================================================
-- 4. Agregar campo examenes_urls si falta (array de URLs)
-- ============================================================
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS examenes_urls TEXT[] DEFAULT '{}';
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS correo_electronico TEXT;

-- FIN DE MIGRACIÓN 006
