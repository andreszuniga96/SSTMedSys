import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import BotonDescargaPDF from "@/components/pdf/BotonDescargaPDF";

export default async function EvaluacionesPage() {
    const supabase = await createClient();

    // Fetch evaluations directly
    const { data: evaluaciones, error: evalError } = await supabase
        .from("evaluaciones")
        .select("*")
        .order("fecha_actual", { ascending: false });

    // Fetch all related certificates
    const { data: certificados } = await supabase.from("certificados_aptitud").select("*");
    const { data: pacientes } = await supabase.from("pacientes").select("*");
    const { data: contextos } = await supabase.from("contexto_laboral").select("*");
    const { data: osteomusculares } = await supabase.from("valoracion_osteomuscular").select("*");
    const { data: historias } = await supabase.from("historia_clinica").select("*");

    // Maps for fast lookup
    const certMap = new Map((certificados || []).map((c) => [c.evaluacion_id, c]));
    const pacMap = new Map((pacientes || []).map((p) => [p.id, p]));
    const ctxMap = new Map((contextos || []).map((c) => [c.paciente_id, c]));
    const ostMap = new Map((osteomusculares || []).map((o) => [o.evaluacion_id, o]));
    const histMap = new Map((historias || []).map((h) => [h.evaluacion_id, h]));

    const conceptoStyle = (concepto: string | undefined) => {
        switch (concepto) {
            case 'Apto': return 'badge-green';
            case 'No Apto': return 'badge-red';
            case 'Apto con Restricciones': return 'badge-amber';
            default: return 'badge-slate';
        }
    };

    const tipoStyle = (tipo: string) => {
        switch (tipo) {
            case 'Pre ingreso':
            case 'Ingreso': return 'badge-blue';
            case 'Periódico': return 'badge-purple';
            case 'Egreso': return 'badge-amber';
            default: return 'badge-slate';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-premium p-6">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        Evaluaciones Médicas Ocupacionales
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Gestión e impresión de certificados de aptitud laboral (CMALAB)
                    </p>
                </div>
                <Link href="/dashboard/evaluaciones/nueva" className="btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Evaluación
                </Link>
            </div>

            {/* Table */}
            <div className="section-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Fecha / Hora</th>
                                <th>Paciente</th>
                                <th>Tipo Examen</th>
                                <th>Énfasis</th>
                                <th>Concepto Médico</th>
                                <th className="text-right">Certificado CMALAB</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!evaluaciones || evaluaciones.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                                        <p className="text-3xl mb-2">📋</p>
                                        <p className="font-semibold">No se han registrado evaluaciones</p>
                                        <p className="text-sm mt-1">Cree una nueva evaluación médica para comenzar</p>
                                    </td>
                                </tr>
                            ) : (
                                evaluaciones.map((evaluacion: any) => {
                                    const paciente = pacMap.get(evaluacion.paciente_id) || {};
                                    const certificado = certMap.get(evaluacion.id) || {};
                                    const contexto = ctxMap.get(evaluacion.paciente_id) || {};
                                    const osteo = ostMap.get(evaluacion.id) || {};
                                    const historia = histMap.get(evaluacion.id) || {};

                                    const datosFormateados = {
                                        tipo_evaluacion: evaluacion.tipo_evaluacion,
                                        fecha_actual: evaluacion.fecha_actual || new Date().toISOString(),
                                        enfasis: evaluacion.enfasis,
                                        examen_nombre: evaluacion.examen_nombre || "Examen medico ocupacional",
                                        hora_realizacion: evaluacion.hora_realizacion,
                                        lugar_realizacion: contexto?.lugar_realizacion || "Pasto - Nariño",
                                        concepto: certificado?.concepto_medico || "Apto",
                                        recomendaciones: certificado?.recomendaciones_generales || "",
                                        restricciones: certificado?.restricciones || "",
                                        riesgos: historia?.riesgos_ocupacionales || {},
                                        firma_paciente_url: certificado?.firma_paciente_url,
                                        firma_paciente_nombre: certificado?.firma_paciente_nombre || paciente?.nombre_completo,
                                        firma_paciente_cedula: certificado?.firma_paciente_cedula || paciente?.documento_identidad,
                                        laboral: contexto,
                                        antecedentes_laborales: certificado?.antecedentes_laborales || { incidentes: "NIEGA", enfermedad_profesional: "NIEGA", secuelas: "NO APLICA" },
                                        aptitudes_tareas: certificado?.aptitudes_tareas,
                                        ingreso_pve_preventivo: certificado?.ingreso_pve_preventivo,
                                        programa_promocion_prevencion: certificado?.programa_promocion_prevencion,
                                        clasificacion_gatiso: certificado?.clasificacion_gatiso,
                                        clasificacion_gatiso_tipo: certificado?.clasificacion_gatiso_tipo,
                                        clasificacion_gatiso_grupo: certificado?.clasificacion_gatiso_grupo,
                                        remision_controles_eps: certificado?.remision_controles_eps,
                                        controles_arl: certificado?.controles_arl,
                                        observaciones_medicas: certificado?.observaciones_medicas,
                                        recomendaciones_laborales: certificado?.recomendaciones_laborales,
                                        restricciones_laborales: certificado?.restricciones_laborales,
                                        otros_examenes_realizados: certificado?.otros_examenes_realizados,
                                        diagnosticos_cie10: certificado?.diagnosticos_cie10 || [],
                                        valoracion_osteomuscular: osteo?.hallazgos,
                                        examenes_complementarios: null,
                                        paciente: paciente,
                                    };

                                    return (
                                        <tr key={evaluacion.id}>
                                            <td>
                                                <div className="font-semibold text-slate-900">
                                                    {new Date(evaluacion.fecha_actual).toLocaleDateString('es-CO')}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {evaluacion.modalidad || "Presencial"}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="font-bold text-slate-900">
                                                    {paciente.nombre_completo || "Paciente sin nombre"}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {paciente.tipo_documento || 'CC'} {paciente.documento_identidad}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${tipoStyle(evaluacion.tipo_evaluacion)}`}>
                                                    {evaluacion.tipo_evaluacion}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="text-sm text-slate-600">
                                                    {evaluacion.enfasis || "General"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${conceptoStyle(certificado.concepto_medico)}`}>
                                                    {certificado.concepto_medico || 'Apto'}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <BotonDescargaPDF
                                                    datosEvaluacion={datosFormateados}
                                                    nombreArchivo={`CMALAB_${paciente.documento_identidad || 'paciente'}_${new Date(evaluacion.fecha_actual).getTime()}`}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}