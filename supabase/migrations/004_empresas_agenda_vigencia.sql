-- ============================================================
-- MIGRACIÓN 004: Empresas + Agenda de citas + Vigencia de exámenes
-- Compatible con Supabase SQL Editor (idempotente)
-- ============================================================

-- 1. TABLA EMPRESAS (clientes/contratantes)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    nit TEXT UNIQUE,
    sector TEXT,
    direccion TEXT,
    ciudad TEXT DEFAULT 'Pasto - Nariño',
    telefono TEXT,
    correo_contacto TEXT,
    nombre_contacto TEXT,
    arl_contratante TEXT,
    estado TEXT DEFAULT 'activa', -- 'activa' | 'inactiva'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'empresas' AND policyname = 'Médicos pueden gestionar empresas'
    ) THEN
        CREATE POLICY "Médicos pueden gestionar empresas"
        ON empresas FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Vínculo entre el contexto laboral (evaluaciones) y la empresa registrada
ALTER TABLE contexto_laboral ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

-- 2. TABLA CITAS (agenda de evaluaciones)
CREATE TABLE IF NOT EXISTS citas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    fecha_cita DATE NOT NULL,
    hora_cita TIME,
    tipo_evaluacion TEXT DEFAULT 'Pre ingreso',
    modalidad TEXT DEFAULT 'Presencial', -- 'Presencial' | 'Virtual'
    estado TEXT DEFAULT 'pendiente',     -- 'pendiente' | 'realizada' | 'cancelada'
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'citas' AND policyname = 'Médicos pueden gestionar citas'
    ) THEN
        CREATE POLICY "Médicos pueden gestionar citas"
        ON citas FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);

-- 3. VIGENCIA DE EXÁMENES (renovación)
-- Vigencia en meses que tiene un examen según riesgo ocupacional (estándar: 12).
-- Se usa para alertar exámenes por vencer en el dashboard.
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS vigencia_meses INTEGER DEFAULT 12;

-- FIN DE MIGRACIÓN
