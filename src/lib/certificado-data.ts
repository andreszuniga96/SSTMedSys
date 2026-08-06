/**
 * Construcción compartida de los datos del certificado CMALAB.
 * Se usa tanto en el listado de evaluaciones (cliente) como en la
 * API de envío automático por correo (servidor).
 */
import QRCode from "qrcode";
import { PUBLIC_APP_URL, SUPABASE_URL } from "@/lib/config";

export interface DatosCertificadoInput {
    evaluacion: any;
    certificado: any;
    paciente: any;
    contexto: any;
    osteomuscular: any;
    historia: any;
}

/**
 * Convierte una URL de imagen a Base64 (data URL) para el render server-side del PDF.
 * - Si es una ruta relativa de storage de Supabase (ej. "123_cedula_1.jpg"),
 *   reconstruye la URL pública de storage con el bucket indicado.
 * - Si es una ruta local de la app (ej. "/sellodra.png"), usa PUBLIC_APP_URL.
 */
export const urlABase64 = async (
    url: string | null | undefined,
    bucket?: string
): Promise<string | null> => {
    if (!url) return null;
    if (url.startsWith("data:image")) return url;

    let fullUrl = url;
    if (!url.startsWith("http")) {
        const supabaseUrl = SUPABASE_URL;
        if (bucket) {
            fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${url}`;
        } else if (url.startsWith("/")) {
            fullUrl = `${PUBLIC_APP_URL}${url}`;
        } else {
            // Ruta de storage sin bucket conocido: intentar storage público genérico
            fullUrl = `${supabaseUrl}/storage/v1/object/public/${url}`;
        }
    }

    try {
        const res = await fetch(fullUrl);
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) return null;
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:${blob.type};base64,${base64}`;
    } catch {
        return null;
    }
};

/** Arma el objeto `datos` que consume CertificadoCMALAB. */
export function construirDatosCertificado({
    evaluacion,
    certificado,
    paciente,
    contexto,
    osteomuscular,
    historia,
}: DatosCertificadoInput): any {
    const certificadoRow = certificado || {};
    const contextoRow = contexto || {};

    return {
        evaluacion_id: evaluacion.id,
        tipo_evaluacion: evaluacion.tipo_evaluacion,
        fecha_actual: evaluacion.fecha_actual || new Date().toISOString(),
        enfasis: evaluacion.enfasis,
        examen_nombre: evaluacion.examen_nombre || "Examen medico ocupacional",
        hora_realizacion: evaluacion.hora_realizacion,
        lugar_realizacion: contextoRow.lugar_realizacion || "Pasto - Nariño",
        concepto: certificadoRow.concepto_medico || "Apto",
        recomendaciones: certificadoRow.recomendaciones_generales || "",
        restricciones: certificadoRow.restricciones || "",
        riesgos: historia?.riesgos_ocupacionales || {},
        firma_paciente_url: certificadoRow.firma_paciente_url,
        firma_paciente_nombre: certificadoRow.firma_paciente_nombre || paciente?.nombre_completo,
        firma_paciente_cedula: certificadoRow.firma_paciente_cedula || paciente?.documento_identidad,
        laboral: contextoRow,
        antecedentes_laborales: certificadoRow.antecedentes_laborales || {
            incidentes: "NIEGA",
            enfermedad_profesional: "NIEGA",
            secuelas: "NO APLICA",
        },
        aptitudes_tareas: certificadoRow.aptitudes_tareas,
        ingreso_pve_preventivo: certificadoRow.ingreso_pve_preventivo,
        programa_promocion_prevencion: certificadoRow.programa_promocion_prevencion,
        clasificacion_gatiso: certificadoRow.clasificacion_gatiso,
        clasificacion_gatiso_tipo: certificadoRow.clasificacion_gatiso_tipo,
        clasificacion_gatiso_grupo: certificadoRow.clasificacion_gatiso_grupo,
        remision_controles_eps: certificadoRow.remision_controles_eps,
        controles_arl: certificadoRow.controles_arl,
        observaciones_medicas: certificadoRow.observaciones_medicas,
        recomendaciones_laborales: certificadoRow.recomendaciones_laborales,
        restricciones_laborales: certificadoRow.restricciones_laborales,
        otros_examenes_realizados: certificadoRow.otros_examenes_realizados,
        diagnosticos_cie10: certificadoRow.diagnosticos_cie10 || [],
        valoracion_osteomuscular: osteomuscular?.hallazgos,
        examenes_complementarios: null,
        paciente: paciente || {},
        // Sello y firma de la doctora: rutas locales por defecto (funcionan en el render
        // cliente con @react-pdf/renderer). Para el render server-side (envío por correo)
        // la API las sobrescribe con URLs absolutas antes de convertirlas a Base64.
        img_doctor_sig: "/firmadra.png",
        img_doctor_seal: "/sellodra.png",
        url_verificacion: `${PUBLIC_APP_URL}/ver-examen/${evaluacion.id}`,
    };
}

/** Genera el QR del enlace público del examen. */
export const generarQR = async (evaluacionId: string): Promise<string | null> => {
    try {
        return await QRCode.toDataURL(`${PUBLIC_APP_URL}/ver-examen/${evaluacionId}`, {
            margin: 1,
            width: 320,
            errorCorrectionLevel: "M",
        });
    } catch {
        return null;
    }
};
