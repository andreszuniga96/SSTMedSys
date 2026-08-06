"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import PageHeader from "@/components/dashboard/PageHeader";
import LoadingState from "@/components/dashboard/LoadingState";
import ConceptoBadge from "@/components/dashboard/ConceptoBadge";
import { descargarCSV } from "@/lib/csv";
import {
    fechaVencimientoDe,
    examenMasRecientePorPaciente,
    clasificarPorVigencia,
    VIGENCIA_DEFAULT_MESES,
} from "@/lib/vigencia";

export default function ReportesPage() {
    const [filtroDesde, setFiltroDesde] = useState("");
    const [filtroHasta, setFiltroHasta] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("");
    const [filtroModalidad, setFiltroModalidad] = useState("");
    const [loading, setLoading] = useState(true);
    const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [contextosPorPaciente, setContextosPorPaciente] = useState<Record<string, any>>({});
    const [filtroEmpresa, setFiltroEmpresa] = useState("");

    useEffect(() => {
        const cargar = async () => {
            setLoading(true);
            try {
                const supabase = createClient();
                const [resEv, resEmp, resCtx] = await Promise.all([
                    supabase
                        .from("evaluaciones")
                        .select(`
                            id,
                            paciente_id,
                            tipo_evaluacion,
                            modalidad,
                            enfasis,
                            fecha_actual,
                            vigencia_meses,
                            paciente:pacientes (
                                id,
                                nombre_completo,
                                documento_identidad
                            ),
                            certificado:certificados_aptitud (
                                concepto_medico
                            )
                        `)
                        .order("fecha_actual", { ascending: false }),
                    supabase.from("empresas").select("id, nombre").order("nombre"),
                    // Contextos laborales ordenados: el más reciente por paciente define su empresa actual
                    supabase
                        .from("contexto_laboral")
                        .select("paciente_id, empresa_nombre, empresa_id")
                        .order("created_at", { ascending: false }),
                ]);
                if (resEv.error) throw resEv.error;
                setEvaluaciones(resEv.data || []);
                setEmpresas(resEmp.data || []);
                const ctxPorPaciente: Record<string, any> = {};
                (resCtx.data || []).forEach((c: any) => {
                    if (!ctxPorPaciente[c.paciente_id]) ctxPorPaciente[c.paciente_id] = c;
                });
                setContextosPorPaciente(ctxPorPaciente);
            } catch (err: any) {
                console.error("Error cargando reportes:", err);
                toast.error(`Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, []);

    const filtradas = useMemo(() => {
        return evaluaciones.filter((ev) => {
            const contexto = ev.paciente_id ? contextosPorPaciente[ev.paciente_id] : null;
            if (filtroDesde && ev.fecha_actual && ev.fecha_actual.slice(0, 10) < filtroDesde) return false;
            if (filtroHasta && ev.fecha_actual && ev.fecha_actual.slice(0, 10) > filtroHasta) return false;
            if (filtroTipo && ev.tipo_evaluacion !== filtroTipo) return false;
            if (filtroModalidad && (ev.modalidad || "Presencial") !== filtroModalidad) return false;
            if (filtroEmpresa && contexto?.empresa_id !== filtroEmpresa) return false;
            return true;
        });
    }, [evaluaciones, contextosPorPaciente, filtroDesde, filtroHasta, filtroTipo, filtroModalidad, filtroEmpresa]);

    const kpis = useMemo(() => {
        const total = filtradas.length;
        const porConcepto: Record<string, number> = {};
        const porTipo: Record<string, number> = {};
        const porModalidad: Record<string, number> = {};
        const porEmpresa: Record<string, { total: number; aptos: number }> = {};

        filtradas.forEach((ev) => {
            const contexto = ev.paciente_id ? contextosPorPaciente[ev.paciente_id] : null;
            const c = ev.certificado?.concepto_medico || "Sin certificado";
            porConcepto[c] = (porConcepto[c] || 0) + 1;
            porTipo[ev.tipo_evaluacion || "—"] = (porTipo[ev.tipo_evaluacion || "—"] || 0) + 1;
            const m = ev.modalidad || "Presencial";
            porModalidad[m] = (porModalidad[m] || 0) + 1;
            const emp = contexto?.empresa_nombre || "Particular";
            if (!porEmpresa[emp]) porEmpresa[emp] = { total: 0, aptos: 0 };
            porEmpresa[emp].total++;
            if (c === "Apto") porEmpresa[emp].aptos++;
        });

        const aptos = porConcepto["Apto"] || 0;
        const tasaAptitud = total > 0 ? Math.round((aptos / total) * 100) : 0;
        return { total, porConcepto, porTipo, porModalidad, porEmpresa, tasaAptitud };
    }, [filtradas]);

    // Vigencia: último examen con certificado por paciente, clasificado por vencimiento
    const { porVencer, vencidos } = useMemo(() => {
        const masRecientes = examenMasRecientePorPaciente(filtradas);
        return clasificarPorVigencia([...masRecientes.values()]);
    }, [filtradas]);

    const exportarGeneral = () => {
        descargarCSV("reporte_evaluaciones_sst", filtradas.map((ev) => ({
            Paciente: ev.paciente?.nombre_completo || "",
            Documento: ev.paciente?.documento_identidad || "",
            Fecha: ev.fecha_actual?.slice(0, 10) || "",
            "Tipo examen": ev.tipo_evaluacion || "",
            Modalidad: ev.modalidad || "Presencial",
            Enfasis: ev.enfasis || "",
            Empresa: (ev.paciente_id ? contextosPorPaciente[ev.paciente_id]?.empresa_nombre : null) || "Particular",
            Concepto: ev.certificado?.concepto_medico || "Sin certificado",
            Vigencia_meses: ev.vigencia_meses ?? VIGENCIA_DEFAULT_MESES,
        })));
    };

    const exportarPorEmpresa = () => {
        descargarCSV("reporte_por_empresa", Object.entries(kpis.porEmpresa).map(([empresa, d]) => ({
            Empresa: empresa,
            "Total exámenes": d.total,
            "Aptos": d.aptos,
            "Tasa aptitud": d.total > 0 ? `${Math.round((d.aptos / d.total) * 100)}%` : "0%",
        })));
    };

    // CSV de vencimientos: exámenes vencidos + por vencer (ya clasificados con el helper)
    const exportarVencimientos = () => {
        type FilaVencimiento = {
            paciente?: { nombre_completo?: string; documento_identidad?: string } | null;
            paciente_id?: string | null;
            tipo_evaluacion?: string | null;
            certificado?: { concepto_medico?: string } | null;
            // clasificarPorVigencia descarta los exámenes sin fecha
            fecha_actual: string;
            vigencia_meses?: number | null;
            diasVencido?: number;
            diasRestantes?: number;
        };
        const fila = (ev: FilaVencimiento, estado: string, detalleDias: string) => ({
            Estado: estado,
            Paciente: ev.paciente?.nombre_completo || "",
            Documento: ev.paciente?.documento_identidad || "",
            Empresa: (ev.paciente_id ? contextosPorPaciente[ev.paciente_id]?.empresa_nombre : null) || "Particular",
            "Tipo examen": ev.tipo_evaluacion || "",
            Concepto: ev.certificado?.concepto_medico || "Sin certificado",
            "Fecha examen": ev.fecha_actual?.slice(0, 10) || "",
            "Fecha vencimiento": fechaVencimientoDe(ev.fecha_actual, ev.vigencia_meses),
            "Detalle vigencia": detalleDias,
        });
        descargarCSV("reporte_vencimientos_sst", [
            ...vencidos.map((ev) => fila(ev, "Vencido", `Vencido hace ${ev.diasVencido} día(s)`)),
            ...porVencer.map((ev) => fila(ev, "Por vencer", ev.diasRestantes === 0 ? "Vence HOY" : `Vence en ${ev.diasRestantes} día(s)`)),
        ]);
    };

    const maxConcepto = Math.max(1, ...Object.values(kpis.porConcepto));

    if (loading) {
        return <LoadingState texto="Generando reportes..." />;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                icono={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                }
                titulo="Reportes e Indicadores"
                subtitulo="Indicadores SST para entregar a empresas y ARL"
                acciones={
                    <>
                        <button onClick={exportarGeneral} className="btn-primary text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Exportar Excel (CSV)
                        </button>
                        <button onClick={exportarPorEmpresa} className="btn-secondary text-sm">
                            Exportar por empresa
                        </button>
                        <button
                            onClick={exportarVencimientos}
                            disabled={vencidos.length === 0 && porVencer.length === 0}
                            className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                                vencidos.length === 0 && porVencer.length === 0
                                    ? "No hay exámenes vencidos ni por vencer en el periodo filtrado"
                                    : "Exportar CSV de vencimientos para empresas y ARL"
                            }
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Exportar vencimientos
                        </button>
                    </>
                }
            />

            {/* Filtros */}
            <div className="card-premium p-5">
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-3">Filtros</p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="label-premium">Desde</label>
                        <input type="date" className="input-premium" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
                    </div>
                    <div>
                        <label className="label-premium">Hasta</label>
                        <input type="date" className="input-premium" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
                    </div>
                    <div>
                        <label className="label-premium">Tipo de examen</label>
                        <select className="select-premium" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="Pre ingreso">Pre ingreso</option>
                            <option value="Periódico">Periódico</option>
                            <option value="Egreso">Egreso</option>
                            <option value="Post incapacidad">Post incapacidad</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Modalidad</label>
                        <select className="select-premium" value={filtroModalidad} onChange={(e) => setFiltroModalidad(e.target.value)}>
                            <option value="">Todas</option>
                            <option value="Presencial">Presencial</option>
                            <option value="Virtual">Virtual (Telemedicina)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Empresa</label>
                        <select className="select-premium" value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
                            <option value="">Todas</option>
                            {empresas.map((e) => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card stat-card-blue relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-xl bg-teal-500/10"></div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Exámenes</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{kpis.total}</p>
                    <p className="text-[0.65rem] text-slate-400 mt-1">En el periodo filtrado</p>
                </div>
                <div className="stat-card stat-card-emerald relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-xl bg-emerald-500/10"></div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aptos</h3>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">{kpis.porConcepto["Apto"] || 0}</p>
                    <p className="text-[0.65rem] text-emerald-600 mt-1">Sin restricciones</p>
                </div>
                <div className="stat-card stat-card-amber relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-xl bg-amber-500/10"></div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tasa de aptitud</h3>
                    <p className="text-3xl font-bold text-amber-700 mt-1">{kpis.tasaAptitud}%</p>
                    <p className="text-[0.65rem] text-amber-600 mt-1">Indicador global</p>
                </div>
                <div className="stat-card stat-card-rose relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-xl bg-rose-500/10"></div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">No aptos + Restricciones</h3>
                    <p className="text-3xl font-bold text-rose-700 mt-1">
                        {(kpis.porConcepto["No Apto"] || 0) + (kpis.porConcepto["Apto con Restricciones"] || 0)}
                    </p>
                    <p className="text-[0.65rem] text-rose-500 mt-1">Requieren seguimiento</p>
                </div>
            </div>

            {/* Vigencia y renovación */}
            {(vencidos.length > 0 || porVencer.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-premium p-5 border-l-4 border-l-red-400">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400">Exámenes vencidos</p>
                                <p className="text-3xl font-bold text-red-700 mt-1">{vencidos.length}</p>
                                <p className="text-[0.65rem] text-slate-400 mt-1">Requieren renovación inmediata</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {vencidos.slice(0, 4).map((ev) => (
                                <div key={ev.id} className="flex justify-between items-center gap-2 text-xs">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-700 truncate">{ev.paciente?.nombre_completo || "Trabajador"}</p>
                                        <p className="text-[0.65rem] text-slate-400">Vence: {fechaVencimientoDe(ev)}</p>
                                    </div>
                                    <span className="text-red-500 font-bold shrink-0">hace {ev.diasVencido} días</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card-premium p-5 border-l-4 border-l-amber-400">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400">Por vencer (60 días)</p>
                                <p className="text-3xl font-bold text-amber-700 mt-1">{porVencer.length}</p>
                                <p className="text-[0.65rem] text-slate-400 mt-1">Programe la renovación</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                            {porVencer.slice(0, 4).map((ev) => (
                                <div key={ev.id} className="flex justify-between items-center gap-2 text-xs">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-700 truncate">{ev.paciente?.nombre_completo || "Trabajador"}</p>
                                        <p className="text-[0.65rem] text-slate-400">Vence: {fechaVencimientoDe(ev)}</p>
                                    </div>
                                    <span className="text-amber-600 font-bold shrink-0">{ev.diasRestantes === 0 ? "Vence HOY" : `vence en ${ev.diasRestantes} días`}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por concepto */}
                <div className="section-premium p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Distribución por Concepto Médico</h3>
                    {Object.entries(kpis.porConcepto).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">Sin datos en el periodo filtrado</p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(kpis.porConcepto).sort((a, b) => b[1] - a[1]).map(([concepto, count]) => (
                                <div key={concepto}>
                                    <div className="flex justify-between items-center mb-1">
                                        <ConceptoBadge concepto={concepto} />
                                        <span className="text-sm font-bold text-slate-700">{count}</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${(count / maxConcepto) * 100}%`, background: "linear-gradient(90deg,#0d9488,#0891b2)" }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Por tipo y modalidad */}
                <div className="section-premium p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Por Tipo de Examen</h3>
                    <div className="space-y-2">
                        {Object.entries(kpis.porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                            <div key={tipo} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-sm font-medium text-slate-700">{tipo}</span>
                                <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">{count}</span>
                            </div>
                        ))}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-6 mb-4">Por Modalidad</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(kpis.porModalidad).map(([mod, count]) => (
                            <div key={mod} className="p-3 rounded-xl border border-slate-200 text-center">
                                <p className="text-2xl font-bold text-slate-900">{count}</p>
                                <p className="text-[0.65rem] font-bold uppercase text-slate-400">{mod}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Por empresa */}
            <div className="section-premium overflow-hidden">
                <div className="section-header section-header-blue">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                        <h3 className="text-sm font-bold text-teal-900">Resumen por Empresa</h3>
                        <p className="text-[0.65rem] text-teal-600">Exámenes y tasa de aptitud por empresa contratante</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Total exámenes</th>
                                <th>Aptos</th>
                                <th>Tasa de aptitud</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(kpis.porEmpresa).length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-slate-400">Sin datos</td></tr>
                            ) : (
                                Object.entries(kpis.porEmpresa).sort((a, b) => b[1].total - a[1].total).map(([empresa, d]) => (
                                    <tr key={empresa}>
                                        <td className="font-semibold text-slate-800">{empresa}</td>
                                        <td>{d.total}</td>
                                        <td>{d.aptos}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.total > 0 ? (d.aptos / d.total) * 100 : 0}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{d.total > 0 ? Math.round((d.aptos / d.total) * 100) : 0}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
