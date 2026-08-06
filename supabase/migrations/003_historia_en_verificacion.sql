-- ============================================================
-- MIGRACIÓN 003: Historia clínica en la verificación pública
-- Permite que el PDF del certificado (estilo factura electrónica)
-- se genere en línea con TODOS los datos, incluida la historia clínica
-- (riesgos ocupacionales) que usa el certificado CMALAB.
-- Compatible con Supabase SQL Editor (idempotente).
-- ============================================================

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
            SELECT jsonb_build_object('riesgos_ocupacionales', h.riesgos_ocupacionales)::jsonb
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

-- FIN DE MIGRACIÓN
