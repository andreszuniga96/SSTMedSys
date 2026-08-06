// ============================================================
// VIGENCIA / RENOVACIÓN de exámenes médicos ocupacionales
// Lógica compartida entre el dashboard (alertas de renovación)
// y la página de reportes (indicadores de vigencia).
// Estándar SST: 12 meses de vigencia si no se especifica otra.
//
// Los helpers son genéricos tolerantes: reciben cualquier fila de
// Supabase (cuyos tipos inferidos no siempre reflejan la relación)
// y acceden a los campos con casts a tipos concretos.
// ============================================================

export const VIGENCIA_DEFAULT_MESES = 12;

const DIAS_MS = 86_400_000;

export interface Vencimiento {
    /** Fecha en que vence el examen */
    venceEn: Date;
    /** true si ya superó su vigencia */
    vencido: boolean;
    /** Días: positivos = faltan para vencer, negativos = vencido hace |dias| */
    dias: number;
}

// Calcula el vencimiento de un examen según su fecha y vigencia en meses.
export const calcularVencimiento = (
    fechaExamen: string,
    vigenciaMeses?: number | null,
    hoy: Date = new Date()
): Vencimiento | null => {
    if (!fechaExamen) return null;
    const venc = new Date(fechaExamen);
    venc.setMonth(venc.getMonth() + (vigenciaMeses || VIGENCIA_DEFAULT_MESES));
    const dias = Math.ceil((venc.getTime() - hoy.getTime()) / DIAS_MS);
    return { venceEn: venc, vencido: venc < hoy, dias };
};

// Fecha legible de vencimiento (DD/MM/AAAA, es-CO) de un examen.
// Usada en las tarjetas de vigencia (reportes), los chips de alerta
// (dashboard / empresa) y la exportación CSV.
export const fechaVencimientoDe = (
    fechaExamen: string | null | undefined,
    vigenciaMeses?: number | null
) =>
    calcularVencimiento(fechaExamen || "", vigenciaMeses)?.venceEn.toLocaleDateString("es-CO") || "—";

// Devuelve la evaluación más reciente con certificado por paciente.
// La vigencia aplica sobre el último examen emitido del trabajador.
export const examenMasRecientePorPaciente = <T>(evaluaciones: T[]): Map<string, T> => {
    const porPaciente = new Map<string, T>();
    (evaluaciones || []).forEach((ev) => {
        const paciente = (ev as { paciente?: { id?: string } | null }).paciente;
        // PostgREST puede devolver null (relación to-one) o [] (to-many)
        // cuando el examen no tiene certificado: ambos deben excluirse
        const cert = (ev as { certificado?: unknown }).certificado;
        const conCertificado = Array.isArray(cert) ? cert.length > 0 : Boolean(cert);
        if (!paciente?.id || !conCertificado) return;
        if (!porPaciente.has(paciente.id)) porPaciente.set(paciente.id, ev);
    });
    return porPaciente;
};

export interface ClasificacionVigencia<T> {
    porVencer: (T & { diasRestantes: number })[];
    vencidos: (T & { diasVencido: number })[];
}

// Clasifica exámenes en vencidos y por vencer dentro de una ventana
// (estándar: próximos 60 días).
export const clasificarPorVigencia = <T>(
    evaluaciones: T[],
    opciones: { hoy?: Date; ventanaDias?: number } = {}
): ClasificacionVigencia<T> => {
    const hoy = opciones.hoy || new Date();
    const ventanaDias = opciones.ventanaDias ?? 60;
    const porVencer: (T & { diasRestantes: number })[] = [];
    const vencidos: (T & { diasVencido: number })[] = [];
    (evaluaciones || []).forEach((ev) => {
        const fechaActual = (ev as { fecha_actual?: string | null }).fecha_actual;
        const vigenciaMeses = (ev as { vigencia_meses?: number | null }).vigencia_meses;
        if (!fechaActual) return;
        const v = calcularVencimiento(fechaActual, vigenciaMeses, hoy);
        if (!v) return;
        if (v.vencido) {
            vencidos.push({ ...ev, diasVencido: Math.abs(v.dias) });
        } else if (v.dias <= ventanaDias) {
            porVencer.push({ ...ev, diasRestantes: v.dias });
        }
    });
    porVencer.sort((a, b) => a.diasRestantes - b.diasRestantes);
    vencidos.sort((a, b) => b.diasVencido - a.diasVencido);
    return { porVencer, vencidos };
};
