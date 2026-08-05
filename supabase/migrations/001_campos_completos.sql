-- ============================================================
-- MIGRACIÓN COMPLETA: CRM Salud Ocupacional (Actualizada)
-- Compatible con Supabase SQL Editor
-- ============================================================

-- 1. TABLA PACIENTES — Nuevos campos demográficos y de salud
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CC';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS correo_electronico TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS telefono_fijo TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS lugar_residencia TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estrato INTEGER DEFAULT 1;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS zona TEXT DEFAULT 'Urbana';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS grupo_etnico TEXT DEFAULT 'No Refiere';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS hijos TEXT DEFAULT 'No refiere';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS imc DECIMAL(5,2);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS regimen TEXT DEFAULT 'Contributivo';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS empresa_en_mision TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS escolaridad TEXT DEFAULT 'Bachiller';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS eps TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS arl TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS fondo_pension TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS profesion TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS movil TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT 'Femenino';

-- 2. TABLA CONTEXTO_LABORAL — Nuevos campos empresa/orden médica
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS empresa_contratante TEXT;
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS empresa_direccion TEXT;
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS hora_ingreso TIME;
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS lugar_realizacion TEXT;
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS entidad_realizadora TEXT;
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS entidad_direccion TEXT;

-- 3. TABLA EVALUACIONES — Campos adicionales
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS examen_nombre TEXT;
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS hora_realizacion TIME;

-- 4. TABLA CERTIFICADOS_APTITUD — Valoración médica completa
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS aptitudes_tareas TEXT;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS ingreso_pve_preventivo TEXT DEFAULT 'Ninguno';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS programa_promocion_prevencion TEXT DEFAULT 'No registra/No aplica';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS clasificacion_gatiso TEXT;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS clasificacion_gatiso_tipo TEXT DEFAULT 'TLUD';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS clasificacion_gatiso_grupo TEXT DEFAULT 'No registra';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS remision_controles_eps TEXT DEFAULT 'Ninguno';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS controles_arl BOOLEAN DEFAULT false;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS observaciones_medicas TEXT;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS recomendaciones_laborales TEXT;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS restricciones_laborales TEXT DEFAULT 'No';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS otros_examenes_realizados TEXT DEFAULT 'No Aplica';
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS diagnosticos_cie10 JSONB DEFAULT '[]'::jsonb;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS firma_paciente_nombre TEXT;
ALTER TABLE certificados_aptitud ADD COLUMN IF NOT EXISTS firma_paciente_cedula TEXT;

-- 5. TABLA: VALORACIÓN OSTEOMUSCULAR
CREATE TABLE IF NOT EXISTS valoracion_osteomuscular (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluacion_id UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
    hallazgos TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE valoracion_osteomuscular ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'valoracion_osteomuscular' AND policyname = 'Médicos pueden gestionar valoraciones osteomusculares'
    ) THEN
        CREATE POLICY "Médicos pueden gestionar valoraciones osteomusculares"
        ON valoracion_osteomuscular FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 6. TABLA: EXÁMENES COMPLEMENTARIOS
CREATE TABLE IF NOT EXISTS examenes_complementarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluacion_id UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
    nombre_examen TEXT NOT NULL,
    descripcion TEXT,
    resultado TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE examenes_complementarios ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'examenes_complementarios' AND policyname = 'Médicos pueden gestionar exámenes complementarios'
    ) THEN
        CREATE POLICY "Médicos pueden gestionar exámenes complementarios"
        ON examenes_complementarios FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 7. TABLA: LÍNEA DE TIEMPO OCUPACIONAL (TIMELINE)
CREATE TABLE IF NOT EXISTS timeline_eventos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    tipo_evento TEXT NOT NULL DEFAULT 'nota_clinica',
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha_evento DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    evaluacion_id UUID REFERENCES evaluaciones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'timeline_eventos' AND policyname = 'Médicos pueden gestionar eventos del timeline'
    ) THEN
        CREATE POLICY "Médicos pueden gestionar eventos del timeline"
        ON timeline_eventos FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_timeline_paciente ON timeline_eventos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_timeline_fecha ON timeline_eventos(fecha_evento DESC);

-- 8. TABLA: PRE-ATENCIÓN Y TELEMEDICINA (Captura Asíncrona)
CREATE TABLE IF NOT EXISTS solicitudes_preatencion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    paciente_nombre TEXT NOT NULL,
    paciente_cedula TEXT NOT NULL,
    paciente_telefono TEXT,
    cedula_foto_url TEXT,
    selfie_foto_url TEXT,
    firma_foto_url TEXT,
    comprobante_pago_url TEXT,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'completada', 'procesada'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE solicitudes_preatencion ENABLE ROW LEVEL SECURITY;

-- Permiso público para crear e insertar datos en preatencion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'solicitudes_preatencion' AND policyname = 'Acceso público solicitudes preatencion'
    ) THEN
        CREATE POLICY "Acceso público solicitudes preatencion"
        ON solicitudes_preatencion FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 9. STORAGE BUCKETS (Públicos/Privados para Biometría y Pre-atención)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pre_atencion_telemedicina', 'pre_atencion_telemedicina', true)
ON CONFLICT (id) DO NOTHING;

-- FIN DE MIGRACIÓN
