"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import LoadingState from "@/components/dashboard/LoadingState";
import ConceptoBadge from "@/components/dashboard/ConceptoBadge";
import AlertaVigencia from "@/components/dashboard/AlertaVigencia";
import { calcularVencimiento, clasificarPorVigencia } from "@/lib/vigencia";

export default function DetalleEmpresaPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id;

    const [empresa, setEmpresa] = useState<any | null>(null);
    const [cargando, setCargando] = useState(true);
    const [examenes, setExamenes] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        if (!id) return;
        const cargar = async () => {
            setCargando(true);
            try {
                const supabase = createClient();

                const { data: emp, error: errEmp } = await supabase
                    .from("empresas")
                    .select("*")
                    .eq("id", id)
                    .single();
                if (errEmp) throw errEmp;
                setEmpresa(emp);

                // Historial de exámenes: contexto_laboral vinculado a la empresa,
                // con las evaluaciones y certificados de cada paciente
                const { data: contextos, error: errCtx } = await supabase
                    .from("contexto_laboral")
                    .select(`
                        id,
                        cargo,
                        fecha_ingreso,
                        empresa_nombre,
                        empresa_id,
                        paciente_id,
                        paciente:pacientes (
                            nombre_completo,
                            documento_identidad,
                            foto_url,
                            movil
                        )
                    `)
                    .eq("empresa_id", id)
                    .order("created_at", { ascending: false });
                if (errCtx) throw errCtx;

                const datos = contextos || [];
                // Para cada contexto, buscar la evaluación más reciente del paciente
                const conEvaluaciones = await Promise.all(
                    datos.map(async (c: any) => {
                        const { data: evs } = await supabase
                            .from("evaluaciones")
                            .select(`
                                id,
                                tipo_evaluacion,
                                enfasis,
                                fecha_actual,
                                modalidad,
                                vigencia_meses,
                                certificado:certificados_aptitud (
                                    concepto_medico
                                )
                            `)
                            .eq("paciente_id", c.paciente_id)
                            .order("fecha_actual", { ascending: false })
                            .limit(3);
                        return { ...c, evaluaciones: evs || [] };
                    })
                );
                setExamenes(conEvaluaciones);
            } catch (err: any) {
                console.error("Error cargando empresa:", err);
                toast.error(`Error: ${err.message}`);
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [id]);

    const totalExamenes = examenes.reduce((acc, e) => acc + (e.evaluaciones?.length || 0), 0);
    const trabajadores = examenes.length;

    const filtrados = examenes.filter((e) => {
        const t = busqueda.toLowerCase();
        return (
            e.paciente?.nombre_completo?.toLowerCase().includes(t) ||
            e.paciente?.documento_identidad?.toLowerCase().includes(t) ||
            e.cargo?.toLowerCase().includes(t)
        );
    });

    // Vigencia: último examen con certificado por trabajador de la empresa
    type EvalEmpresa = {
        id?: string;
        fecha_actual?: string | null;
        vigencia_meses?: number | null;
        certificado?: { concepto_medico?: string } | null;
    };
    const ultimosExamenes = (examenes || [])
        .map((c) => {
            const evaluaciones = ((c as { evaluaciones?: EvalEmpresa[] } | null)?.evaluaciones || []) as EvalEmpresa[];
            const ultimo = evaluaciones.find((ev) => ev.certificado?.concepto_medico);
            if (!ultimo) return null;
            return { ...ultimo, paciente: { id: c.paciente_id, nombre_completo: c.paciente?.nombre_completo } };
        })
        .filter(Boolean);

    const { porVencer, vencidos } = clasificarPorVigencia(ultimosExamenes);

    // Estado de vigencia por trabajador (para la columna de la tabla)
    const vigenciaPorPaciente: Record<string, { estado: "vencido" | "por_vencer" | "vigente"; dias: number }> = {};
    ultimosExamenes.forEach((ev) => {
        if (!ev) return;
        const pid = ev.paciente?.id;
        if (!pid) return;
        const v = calcularVencimiento(ev.fecha_actual ?? "", ev.vigencia_meses);
        if (!v) return;
        if (v.vencido) vigenciaPorPaciente[pid] = { estado: "vencido", dias: Math.abs(v.dias) };
        else if (v.dias <= 60) vigenciaPorPaciente[pid] = { estado: "por_vencer", dias: v.dias };
        else vigenciaPorPaciente[pid] = { estado: "vigente", dias: v.dias };
    });

    if (cargando) {
        return <LoadingState texto="Cargando empresa..." />;
    }

    if (!empresa) {
        return (
            <div className="section-premium p-12 text-center">
                <p className="font-bold text-slate-800">Empresa no encontrada</p>
                <button onClick={() => router.push("/dashboard/empresas")} className="btn-primary text-xs mt-4">
                    ← Volver a Empresas
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                        {empresa.nombre?.charAt(0).toUpperCase() || "E"}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{empresa.nombre}</h1>
                        <p className="text-sm text-slate-500">
                            NIT: {empresa.nit || "—"} · {empresa.ciudad || "Pasto - Nariño"}
                        </p>
                    </div>
                </div>
                <button onClick={() => router.push("/dashboard/empresas")} className="btn-secondary text-sm">
                    ← Volver
                </button>
            </div>

            {/* Datos de contacto */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-premium p-4">
                    <p className="text-[0.65rem] font-bold uppercase text-slate-400">Contacto</p>
                    <p className="font-semibold text-slate-800 mt-1">{empresa.nombre_contacto || "—"}</p>
                    <p className="text-xs text-slate-500">{empresa.correo_contacto || "Sin correo"}</p>
                    <p className="text-xs text-slate-500">{empresa.telefono || "Sin teléfono"}</p>
                </div>
                <div className="card-premium p-4">
                    <p className="text-[0.65rem] font-bold uppercase text-slate-400">ARL / Sector</p>
                    <p className="font-semibold text-slate-800 mt-1">{empresa.arl_contratante || "No registrada"}</p>
                    <p className="text-xs text-slate-500">{empresa.sector || "Sector no especificado"}</p>
                    <p className="text-xs text-slate-500">{empresa.direccion || ""}</p>
                </div>
                <div className="card-premium p-4 flex items-center gap-6 justify-center">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-teal-700">{trabajadores}</p>
                        <p className="text-[0.65rem] font-bold uppercase text-slate-400">Trabajadores</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-cyan-700">{totalExamenes}</p>
                        <p className="text-[0.65rem] font-bold uppercase text-slate-400">Exámenes</p>
                    </div>
                </div>
            </div>

            {/* Alertas de vigencia de la empresa */}
            <AlertaVigencia vencidos={vencidos} porVencer={porVencer} />

            {/* Historial */}
            <div className="section-premium overflow-hidden">
                <div className="section-header section-header-blue">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <div>
                        <h3 className="text-sm font-bold text-teal-900">Historial de Exámenes Ocupacionales</h3>
                        <p className="text-[0.65rem] text-teal-600">Trabajadores vinculados y sus últimas evaluaciones</p>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Buscar trabajador por nombre o documento..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Trabajador</th>
                                <th>Cargo</th>
                                <th>Documento</th>
                                <th>Exámenes</th>
                                <th>Vigencia</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-slate-400">
                                        <p className="font-semibold">Sin trabajadores vinculados</p>
                                        <p className="text-xs mt-1">Los exámenes aparecerán aquí cuando se registre una evaluación con esta empresa.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((c: any) => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                {c.paciente?.foto_url ? (
                                                    <img src={c.paciente.foto_url} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                                                        {c.paciente?.nombre_completo?.charAt(0) || "?"}
                                                    </div>
                                                )}
                                                <div>
                                                    <Link href={`/dashboard/pacientes?q=${encodeURIComponent(c.paciente?.documento_identidad || "")}`} className="font-bold text-slate-900 text-sm hover:text-teal-600">
                                                        {c.paciente?.nombre_completo || "—"}
                                                    </Link>
                                                    <div className="text-[0.7rem] text-slate-500">{c.paciente?.movil || ""}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-sm text-slate-700">{c.cargo || "—"}</td>
                                        <td className="text-sm text-slate-500">{c.paciente?.documento_identidad || "—"}</td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {c.evaluaciones?.length === 0 && <span className="text-xs text-slate-400">Sin evaluaciones</span>}
                                                {c.evaluaciones?.map((ev: any) => (
                                                    <div key={ev.id} className="flex items-center gap-2">
                                                        <span className="text-[0.7rem] text-slate-500">
                                                            {new Date(ev.fecha_actual).toLocaleDateString('es-CO')} · {ev.tipo_evaluacion}
                                                        </span>
                                                        <ConceptoBadge concepto={ev.certificado?.concepto_medico} />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            {(() => {
                                                const v = vigenciaPorPaciente[c.paciente_id];
                                                if (!v) return <span className="badge badge-slate">Sin certificado</span>;
                                                if (v.estado === "vencido" || v.estado === "por_vencer") {
                                                    return (
                                                        <div className="flex flex-col gap-1 items-start">
                                                            {v.estado === "vencido" ? (
                                                                <span className="badge badge-red">Vencido hace {v.dias} día(s)</span>
                                                            ) : (
                                                                <span className="badge badge-amber">{v.dias === 0 ? "Vence HOY" : `Vence en ${v.dias} días`}</span>
                                                            )}
                                                            <Link
                                                                href={`/dashboard/evaluaciones/nueva?paciente_id=${c.paciente_id}&empresa_id=${id}`}
                                                                className="text-[0.65rem] font-bold text-teal-700 hover:underline"
                                                            >
                                                                Renovar →
                                                            </Link>
                                                        </div>
                                                    );
                                                }
                                                return <span className="badge badge-green">Vigente</span>;
                                            })()}
                                        </td>
                                        <td className="text-right">
                                            <Link
                                                href={`/dashboard/evaluaciones/nueva?paciente_id=${c.paciente_id}&empresa_id=${id}`}
                                                className="inline-flex px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                + Nueva Evaluación
                                            </Link>
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
