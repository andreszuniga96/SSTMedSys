"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BotonDescargaPDF from "@/components/pdf/BotonDescargaPDF";
import BotonEnviarCorreo from "@/components/BotonEnviarCorreo";
import { construirDatosCertificado, type DatosCertificadoInput } from "@/lib/certificado-data";
import ConceptoBadge from "@/components/dashboard/ConceptoBadge";

type TabId = "presencial" | "virtual";

interface EvaluacionesTabsProps {
    evaluaciones: any[];
    certificados: any[];
    pacientes: any[];
    contextos: any[];
    osteomusculares: any[];
    historias: any[];
}

const esVirtual = (e: any) => {
    const modalidad = (e.modalidad || "Presencial").toLowerCase();
    return modalidad.includes("virt") || modalidad.includes("tele");
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

export default function EvaluacionesTabs({ evaluaciones, certificados, pacientes, contextos, osteomusculares, historias }: EvaluacionesTabsProps) {
    const [tab, setTab] = useState<TabId>("presencial");
    const [busqueda, setBusqueda] = useState("");

    const certMap = useMemo(() => new Map((certificados || []).map((c) => [c.evaluacion_id, c])), [certificados]);
    const pacMap = useMemo(() => new Map((pacientes || []).map((p) => [p.id, p])), [pacientes]);
    const ctxMap = useMemo(() => new Map((contextos || []).map((c) => [c.paciente_id, c])), [contextos]);
    const ostMap = useMemo(() => new Map((osteomusculares || []).map((o) => [o.evaluacion_id, o])), [osteomusculares]);
    const histMap = useMemo(() => new Map((historias || []).map((h) => [h.evaluacion_id, h])), [historias]);

    const presenciales = (evaluaciones || []).filter((e) => !esVirtual(e));
    const virtuales = (evaluaciones || []).filter((e) => esVirtual(e));
    const baseList = tab === "presencial" ? presenciales : virtuales;

    const listadoActual = useMemo(() => {
        if (!busqueda.trim() || busqueda.length < 2) return baseList;
        const q = busqueda.toLowerCase();
        return baseList.filter((ev) => {
            const paciente = pacMap.get(ev.paciente_id);
            return (
                paciente?.nombre_completo?.toLowerCase().includes(q) ||
                paciente?.documento_identidad?.toLowerCase().includes(q)
            );
        });
    }, [baseList, busqueda, pacMap]);

    const tabs: { id: TabId; label: string; count: number; desc: string }[] = [
        { id: "presencial", label: "Pacientes Presenciales", count: presenciales.length, desc: "Evaluaciones realizadas en consultorio" },
        { id: "virtual", label: "Telemedicina (Virtuales)", count: virtuales.length, desc: "Evaluaciones por portal pre-atención" },
    ];

    const renderFila = (evaluacion: any) => {
        const paciente = pacMap.get(evaluacion.paciente_id) || {};
        const certificado = certMap.get(evaluacion.id) || {};
        const contexto = ctxMap.get(evaluacion.paciente_id) || {};
        const osteo = ostMap.get(evaluacion.id) || {};
        const historia = histMap.get(evaluacion.id) || {};

        const datosFormateados = construirDatosCertificado({
            evaluacion,
            certificado: certificado || {},
            paciente,
            contexto: contexto || {},
            osteomuscular: osteo || {},
            historia: historia || {},
        } as DatosCertificadoInput);

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
                        <Link href={`/dashboard/pacientes/${paciente.id}`} className="hover:text-teal-700 transition-colors">
                            {paciente.nombre_completo || "Paciente sin nombre"}
                        </Link>
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
                    <ConceptoBadge concepto={certificado.concepto_medico} />
                </td>
                <td className="text-right">
                    <div className="flex justify-end items-center gap-2">
                        <BotonEnviarCorreo
                            evaluacionId={evaluacion.id}
                            correoPaciente={paciente.correo_electronico}
                            nombrePaciente={paciente.nombre_completo}
                        />
                        <Link
                            href={`/dashboard/evaluaciones/${evaluacion.id}/editar`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Editar evaluación y actualizar certificado"
                        >
                            ✏️ Editar
                        </Link>
                        <Link
                            href={`/ver-examen/${evaluacion.id}`}
                            target="_blank"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors"
                            title="Ver examen en línea (enlace público del QR)"
                        >
                            🔗 Ver en línea
                        </Link>
                        <BotonDescargaPDF
                            datosEvaluacion={datosFormateados}
                            nombreArchivo={`CMALAB_${paciente.documento_identidad || 'paciente'}_${new Date(evaluacion.fecha_actual).getTime()}`}
                        />
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6">
            {/* Tabs Presencial / Virtual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tabs.map((t) => {
                    const isPresencial = t.id === "presencial";
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-300 group ${
                                tab === t.id
                                    ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md"
                                    : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm"
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                    tab === t.id ? "bg-teal-600 text-white shadow-lg" : "bg-slate-100 text-slate-500"
                                }`}>
                                    {isPresencial ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className={`font-bold text-sm ${tab === t.id ? "text-teal-900" : "text-slate-800"}`}>
                                            {t.label}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            tab === t.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                                        }`}>
                                            {t.count}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                                </div>
                                {tab === t.id && (
                                    <span className="absolute top-3 right-3 text-teal-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Tabla de la sección activa */}
            <div className="section-premium overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-cyan-50/50">
                    <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-teal-700 bg-teal-100">
                            {tab === "presencial" ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            )}
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                {tab === "presencial" ? "Evaluaciones Presenciales" : "Evaluaciones por Telemedicina"}
                            </h3>
                            <p className="text-[0.7rem] text-slate-500">
                                {listadoActual.length} evaluación(es) · {tab === "virtual" ? "Pacientes que diligenciaron el portal pre-atención" : "Pacientes atendidos en consultorio"}
                            </p>
                        </div>
                    </div>
                    <div className="px-4 py-3 border-b border-slate-100">
                        <div className="relative max-w-sm">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o documento..."
                                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 outline-none transition-all"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                            {busqueda && (
                                <button
                                    onClick={() => setBusqueda("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                        {busqueda.length >= 2 && (
                            <p className="text-xs text-slate-500 mt-1.5">
                                {listadoActual.length} resultado(s) para &ldquo;{busqueda}&rdquo;
                            </p>
                        )}
                    </div>
                </div>
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
                            {listadoActual.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center">
                                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold">
                                            {tab === "presencial" ? "No hay evaluaciones presenciales registradas" : "No hay evaluaciones virtuales (telemedicina) registradas"}
                                        </p>
                                        <p className="text-sm mt-1">Cree una nueva evaluación médica para comenzar</p>
                                    </td>
                                </tr>
                            ) : (
                                listadoActual.map(renderFila)
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
