-- ============================================================
-- MIGRACIÓN 005: Mejoras a la verificación pública + campos faltantes
-- Actualiza obtener_examen_publico para incluir antecedentes_laborales
-- (campo que el PDF CMALAB necesita para renderizar completamente).
-- Compatible con Supabase SQL Editor (idempotente).
-- ============================================================

-- 1. Actualizar función pública: incluir antecedentes_laborales del certificado
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
        ),
        'historia', (
            SELECT jsonb_build_object(
                'riesgos_ocupacionales', h.riesgos_ocupacionales,
                'anamnesis', h.anamnesis,
                'hallazgos_examen_fisico', h.hallazgos_examen_fisico
            )::jsonb
            FROM historia_clinica h
            WHERE h.evaluacion_id = e.id
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
GRANT EXECUTE ON FUNCTION public.obtener_examen_publico(UUID) TO authenticated;

-- 2. Asegurar que solicitudes_preatencion tiene todos los campos necesarios
-- (la UI de pacientes.page.tsx lee estos campos)
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS correo TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS empresa TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS eps TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS arl TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT 'Femenino';
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE solicitudes_preatencion ADD COLUMN IF NOT EXISTS direccion TEXT;

-- 3. Índice para búsqueda rápida de solicitudes por cédula
CREATE INDEX IF NOT EXISTS idx_solicitudes_cedula ON solicitudes_preatencion(paciente_cedula);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_preatencion(estado);

-- FIN DE MIGRACIÓN
