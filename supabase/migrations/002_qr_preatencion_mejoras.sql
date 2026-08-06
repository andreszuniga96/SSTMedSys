-- ============================================================
-- MIGRACIÓN 002: QR de verificación + Pacientes Virtuales (Telemedicina)
-- Compatible con Supabase SQL Editor
-- ============================================================

-- 1. TABLA PACIENTES — Distinguir presenciales vs virtuales (telemedicina)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'presencial'; -- 'presencial' | 'virtual'
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS firma_url TEXT;                  -- firma capturada en portal pre-atención
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS solicitud_preatencion_id UUID;   -- solicitud que dio origen al paciente
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS cedula_foto_url TEXT;            -- foto de cédula adjunta por el paciente

-- 2. TABLA SOLICITUDES_PREATENCION — Campos completos para crear el paciente
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS correo_electronico TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS genero TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS eps TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS arl TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS empresa_nombre TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS lugar_residencia TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS examenes_urls JSONB DEFAULT '[]'::jsonb; -- exámenes previos adjuntados
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS paciente_id UUID; -- paciente creado desde la solicitud

-- 3. FUNCIÓN PÚBLICA DE VERIFICACIÓN (QR del certificado)
-- Permite que un paciente (sin autenticación) consulte su examen desde el QR
CREATE OR REPLACE FUNCTION public.obtener_examen_publico(p_evaluacion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'evaluacion', row_to_json(e)::jsonb,
        'certificado', (
            SELECT row_to_json(c)::jsonb
            FROM certificados_aptitud c
            WHERE c.evaluacion_id = e.id
            LIMIT 1
        ),
        'paciente', (
            SELECT row_to_json(p)::jsonb
            FROM pacientes p
            WHERE p.id = e.paciente_id
        ),
        'contexto', (
            SELECT row_to_json(cl)::jsonb
            FROM contexto_laboral cl
            WHERE cl.paciente_id = e.paciente_id
            ORDER BY cl.created_at DESC
            LIMIT 1
        ),
        'osteomuscular', (
            SELECT row_to_json(vo)::jsonb
            FROM valoracion_osteomuscular vo
            WHERE vo.evaluacion_id = e.id
            LIMIT 1
        )
    )
    INTO resultado
    FROM evaluaciones e
    WHERE e.id = p_evaluacion_id;

    RETURN resultado;
END;
$$;

-- Solo el rol anónimo puede ejecutarla (expone exclusivamente el examen solicitado)
REVOKE ALL ON FUNCTION public.obtener_examen_publico(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_examen_publico(UUID) TO anon;

-- FIN DE MIGRACIÓN
