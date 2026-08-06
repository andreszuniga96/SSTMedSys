"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";

// Botón de descarga que genera el PDF en el cliente (funciona en celulares,
// incl. iOS donde el visor embebido puede fallar)
const BotonDescargarCertificado = dynamic(
    () => import("@/components/pdf/BotonDescargarCertificadoPublico"),
    {
        ssr: false,
        loading: () => (
            <button disabled className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 font-semibold rounded-xl text-sm cursor-wait">
                Cargando descarga...
            </button>
        ),
    }
);

const conceptoStyle = (concepto: string | undefined) => {
    switch (concepto) {
        case 'Apto': return "bg-emerald-100 text-emerald-800 border-emerald-300";
        case 'No Apto': return "bg-red-100 text-red-800 border-red-300";
        case 'Apto con Restricciones': return "bg-amber-100 text-amber-800 border-amber-300";
        case 'Aplazado': return "bg-sky-100 text-sky-800 border-sky-300";
        default: return "bg-slate-100 text-slate-700 border-slate-300";
    }
};

export default function VerExamenPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [examen, setExamen] = useState<any>(null);

    useEffect(() => {
        if (!id) {
            setError("Código de verificación no encontrado.");
            setLoading(false);
            return;
        }
        const cargar = async () => {
            setLoading(true);
            try {
                const supabase = createClient();
                const { data, error } = await supabase.rpc("obtener_examen_publico", { p_evaluacion_id: id });
                if (error) throw error;
                if (!data || !data.evaluacion) {
                    setError("El código de verificación no existe o el examen ya no está disponible.");
                    return;
                }
                setExamen(data);
            } catch (err: any) {
                console.error("Error verificando examen:", err);
                setError("No fue posible consultar el examen. Verifique que el enlace sea correcto.");
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
                    <p className="text-sm text-slate-500">Consultando su examen médico ocupacional...</p>
                </div>
            </div>
        );
    }

    if (error || !examen) {
        return (
            <div className="min-h-screen bg-teal-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center bg-white rounded-2xl border border-slate-200 shadow-xl p-10 space-y-4 animate-scale-in">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Código no válido</h1>
                    <p className="text-sm text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    const ev = examen.evaluacion;
    const cert = examen.certificado || {};
    const pac = examen.paciente || {};
    const ctx = examen.contexto || {};

    return (
        <div className="min-h-screen bg-teal-50/60">
            {/* Header público */}
            <header className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21s-6.5-4.35-9-8.5C1.5 9.5 3.5 5.5 7 4.5c2.2-.6 4.5.2 5 1 .5-.8 2.8-1.6 5-1 3.5 1 5.5 5 4 8-2.5 4.15-9 8.5-9 8.5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-tight">SST MedSys</h1>
                                <p className="text-xs text-teal-300">Verificación digital de examen médico ocupacional</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Documento verificado
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Visor del certificado PDF en línea (estilo factura electrónica) */}
                {cert?.concepto_medico ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 bg-gradient-to-r from-teal-900 to-cyan-900 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 text-teal-200 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zM12 3v6h6" />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Certificado Médico Ocupacional</h3>
                                    <p className="text-[0.7rem] text-teal-300">Documento oficial en línea — verifique su contenido y descárguelo si lo requiere</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <a
                                    href={`/ver-examen/${id}/pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-teal-50 text-teal-900 font-semibold rounded-xl text-sm transition-all shadow"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Ver PDF
                                </a>
                                <BotonDescargarCertificado examen={examen} id={id} variante="header" />

                            </div>
                        </div>
                        <div className="bg-slate-100 p-3 sm:p-4">
                            <iframe
                                src={`/ver-examen/${id}/pdf`}
                                title="Certificado Médico Ocupacional en línea"
                                className="w-full h-[62vh] min-h-[420px] bg-white rounded-xl border border-slate-200 shadow-inner"
                            />
                            <p className="text-[0.68rem] text-slate-400 text-center mt-2">
                                Si el visor no carga en su dispositivo, use el botón «Ver PDF» para abrirlo en una pestaña nueva.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 flex items-center gap-4 animate-fade-in">
                        <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Certificado en proceso</h3>
                            <p className="text-sm text-slate-600">
                                Este examen aún no tiene certificado emitido. En cuanto su médico ocupacional lo genere,
                                podrá verlo y descargarlo en línea desde este mismo enlace.
                            </p>
                        </div>
                    </div>
                )}

                {/* Encabezado del examen */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            {pac.foto_url ? (
                                <img src={pac.foto_url} alt="Paciente" className="w-16 h-16 rounded-full object-cover border-2 border-teal-500 shadow" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow">
                                    {(pac.nombre_completo || "P").charAt(0)}
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900">{pac.nombre_completo || "Paciente"}</h2>
                                <p className="text-sm text-slate-500">
                                    {pac.tipo_documento || "CC"} {pac.documento_identidad}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {new Date(ev.fecha_actual).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} · {ev.hora_realizacion || ""}
                                </p>
                            </div>
                        </div>
                        <span className={`px-4 py-2 rounded-full border text-sm font-bold ${conceptoStyle(cert.concepto_medico)}`}>
                            {cert.concepto_medico || "Pendiente"}
                        </span>
                    </div>
                </div>

                {/* Datos del examen */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-200 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Información del Examen</h3>
                            <p className="text-[0.7rem] text-slate-500">Datos registrados por su médico ocupacional</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400">Tipo de examen</p>
                            <p className="font-semibold text-slate-800">{ev.tipo_evaluacion}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400">Énfasis</p>
                            <p className="font-semibold text-slate-800">{ev.enfasis || "General"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400">Empresa</p>
                            <p className="font-semibold text-slate-800">{ctx.empresa_nombre || "Particular"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400">Cargo</p>
                            <p className="font-semibold text-slate-800">{ctx.cargo || pac.profesion || "No registrado"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400">Lugar de realización</p>
                            <p className="font-semibold text-slate-800">{ctx.lugar_realizacion || "Pasto - Nariño"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400">Entidad realizadora</p>
                            <p className="font-semibold text-slate-800">{ctx.entidad_realizadora || "No registrado"}</p>
                        </div>
                    </div>
                </div>

                {/* Concepto y recomendaciones */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                    <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12h4l2-6 4 12 2-6h6" />
                            </svg>
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Resultado de la Valoración Médica</h3>
                            <p className="text-[0.7rem] text-slate-500">Concepto médico de aptitud laboral</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4 text-sm">
                        <div>
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1">Aptitudes y tareas</p>
                            <p className="text-slate-800">{cert.aptitudes_tareas || "No aplica"}</p>
                        </div>
                        {cert.recomendaciones_generales && (
                            <div>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1">Recomendaciones</p>
                                <p className="text-slate-800 whitespace-pre-line">{cert.recomendaciones_generales}</p>
                            </div>
                        )}
                        {cert.restricciones && (
                            <div>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1">Restricciones</p>
                                <p className="text-slate-800 whitespace-pre-line">{cert.restricciones}</p>
                            </div>
                        )}
                        {cert.observaciones_medicas && (
                            <div>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400 mb-1">Observaciones médicas</p>
                                <p className="text-slate-800 whitespace-pre-line">{cert.observaciones_medicas}</p>
                            </div>
                        )}
                        {Array.isArray(cert.diagnosticos_cie10) && cert.diagnosticos_cie10.length > 0 && (
                            <div>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400 mb-2">Diagnósticos CIE-10</p>
                                <div className="flex flex-wrap gap-2">
                                    {cert.diagnosticos_cie10.map((d: any, i: number) => (
                                        <span key={i} className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-medium">
                                            {d.codigo} — {d.nombre}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Firma y acciones */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
                    <div className="text-center md:text-left">
                        {cert.firma_paciente_url ? (
                            <img src={cert.firma_paciente_url} alt="Firma del trabajador" className="h-16 object-contain mb-1" />
                        ) : (
                            <p className="text-xs text-slate-400 italic mb-1">Firma del trabajador no disponible en versión digital</p>
                        )}
                        <p className="text-xs text-slate-600">Firma del trabajador</p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {/* Solo se ofrece descarga cuando el certificado ya fue emitido (evita PDF falsos) */}
                        {cert?.concepto_medico && <BotonDescargarCertificado examen={examen} id={id} />}
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir constancia
                        </button>
                        <a
                            href={`mailto:?subject=Mi examen médico ocupacional&body=Puede consultar mi examen médico ocupacional en el siguiente enlace: ${window.location.href}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:border-teal-400 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Enviar por correo
                        </a>
                    </div>
                </div>

                <p className="text-center text-[0.7rem] text-slate-400 pb-8">
                    Documento emitido por SST MedSys · Dra. Viviana Quiroz R. · Resolución 2346/2007 · Decreto 1072/2015 · Ley 1581/2012
                </p>
            </main>
        </div>
    );
}
