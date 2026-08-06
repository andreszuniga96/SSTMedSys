"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const TIPOS_EVENTO: Record<string, { color: string; label: string; bg: string; ring: string }> = {
    evaluacion_medica: { color: "#0d9488", label: "Evaluación Médica", bg: "bg-teal-50 border-teal-200", ring: "bg-teal-500" },
    incapacidad: { color: "#d97706", label: "Incapacidad", bg: "bg-amber-50 border-amber-200", ring: "bg-amber-500" },
    accidente_laboral: { color: "#dc2626", label: "Accidente Laboral", bg: "bg-red-50 border-red-200", ring: "bg-red-500" },
    enfermedad_profesional: { color: "#9333ea", label: "Enfermedad Profesional", bg: "bg-purple-50 border-purple-200", ring: "bg-purple-500" },
    cambio_cargo: { color: "#059669", label: "Cambio de Cargo", bg: "bg-emerald-50 border-emerald-200", ring: "bg-emerald-500" },
    capacitacion: { color: "#4f46e5", label: "Capacitación SST", bg: "bg-indigo-50 border-indigo-200", ring: "bg-indigo-500" },
    vacunacion: { color: "#0d9488", label: "Vacunación", bg: "bg-teal-50 border-teal-200", ring: "bg-teal-500" },
    examen_complementario: { color: "#0891b2", label: "Examen Complementario", bg: "bg-cyan-50 border-cyan-200", ring: "bg-cyan-500" },
    nota_clinica: { color: "#64748b", label: "Nota Clínica", bg: "bg-slate-50 border-slate-200", ring: "bg-slate-500" },
};

type TipoEvento = keyof typeof TIPOS_EVENTO;

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

const formatearFechaCorta = (fecha: string) =>
    new Date(fecha).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });

export default function TimelinePage() {
    const supabase = createClient();
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [pacienteId, setPacienteId] = useState("");
    const [eventos, setEventos] = useState<any[]>([]);
    const [evaluacionesPaciente, setEvaluacionesPaciente] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");
    const [showModal, setShowModal] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [eliminandoId, setEliminandoId] = useState<string | null>(null);

    // Form
    const [nuevoEvento, setNuevoEvento] = useState({
        tipo_evento: "nota_clinica" as TipoEvento,
        titulo: "",
        descripcion: "",
        fecha_evento: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from("pacientes").select("id, nombre_completo, documento_identidad, eps, arl, genero, fecha_nacimiento").order("nombre_completo");
            if (data) setPacientes(data);
        };
        fetch();
    }, [supabase]);

    const cargarDatosPaciente = useCallback(async (pid: string) => {
        if (!pid) return;
        setLoading(true);

        let query = supabase
            .from("timeline_eventos")
            .select("*")
            .eq("paciente_id", pid)
            .order("fecha_evento", { ascending: false });

        if (filtroTipo !== "todos") {
            query = query.eq("tipo_evento", filtroTipo);
        }

        const { data: evs } = await query;
        setEventos(evs || []);

        const { data: evals } = await supabase
            .from("evaluaciones")
            .select("*")
            .eq("paciente_id", pid)
            .order("fecha_actual", { ascending: false });

        setEvaluacionesPaciente(evals || []);
        setLoading(false);
    }, [supabase, filtroTipo]);

    useEffect(() => {
        if (pacienteId) cargarDatosPaciente(pacienteId);
    }, [pacienteId, filtroTipo, cargarDatosPaciente]);

    const guardarEvento = async () => {
        if (!pacienteId || !nuevoEvento.titulo) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return toast.error("Sesión no encontrada");

        const { error } = await supabase.from("timeline_eventos").insert({
            paciente_id: pacienteId,
            tipo_evento: nuevoEvento.tipo_evento,
            titulo: nuevoEvento.titulo,
            descripcion: nuevoEvento.descripcion,
            fecha_evento: nuevoEvento.fecha_evento,
            created_by: user.id,
        });

        if (error) return toast.error(`Error: ${error.message}`);

        toast.success("Evento agregado exitosamente");
        setShowModal(false);
        setNuevoEvento({ tipo_evento: "nota_clinica", titulo: "", descripcion: "", fecha_evento: new Date().toISOString().split("T")[0] });
        cargarDatosPaciente(pacienteId);
    };

    const eliminarEvento = async (id: string) => {
        if (!confirm("¿Eliminar este evento del historial clínico?")) return;
        setEliminandoId(id);
        const { error } = await supabase.from("timeline_eventos").delete().eq("id", id);
        setEliminandoId(null);
        if (error) return toast.error(`Error al eliminar: ${error.message}`);
        toast.success("Evento eliminado");
        cargarDatosPaciente(pacienteId);
    };

    const pacienteFiltrado = busqueda.length >= 2
        ? pacientes.filter((p) =>
            p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.documento_identidad.includes(busqueda)
        )
        : pacientes;

    const pacienteActual = pacientes.find((p) => p.id === pacienteId);
    const ultimaEvaluacion = evaluacionesPaciente.length > 0 ? evaluacionesPaciente[0] : null;

    // Agrupar eventos por fecha para una línea de tiempo cronológica
    const eventosAgrupados = useMemo(() => {
        const grupos = new Map<string, any[]>();
        for (const evt of eventos) {
            const clave = evt.fecha_evento ? evt.fecha_evento.slice(0, 10) : "sin-fecha";
            if (!grupos.has(clave)) grupos.set(clave, []);
            grupos.get(clave)!.push(evt);
        }
        return Array.from(grupos.entries());
    }, [eventos]);

    const totalPorTipo = useMemo(() => {
        const conteo: Record<string, number> = { todos: eventos.length };
        for (const evt of eventos) {
            conteo[evt.tipo_evento] = (conteo[evt.tipo_evento] || 0) + 1;
        }
        return conteo;
    }, [eventos]);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-premium p-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-teal-700 bg-teal-50 border border-teal-200 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            Línea de Tiempo Ocupacional
                        </h2>
                        <p className="text-sm text-slate-600 mt-0.5">
                            Historial clínico longitudinal y evolución médica del trabajador
                        </p>
                    </div>
                </div>
            </div>

            {/* Patient Selector */}
            <div className="section-premium">
                <div className="section-header section-header-blue">
                    <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-sm font-bold text-teal-900">Seleccionar Trabajador para Auditoría Médica</h3>
                </div>
                <div className="section-body space-y-3">
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Buscar por nombre o documento... (mín. 2 letras)"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <select
                        className="select-premium font-bold text-teal-900"
                        value={pacienteId}
                        onChange={(e) => setPacienteId(e.target.value)}
                    >
                        <option value="">— Seleccione un paciente para ver su historial —</option>
                        {pacienteFiltrado.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.documento_identidad} — {p.nombre_completo}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {pacienteId && (
                <>
                    {/* Clinical Summary Header Card */}
                    {pacienteActual && (
                        <div className="card-premium p-6 bg-gradient-to-r from-slate-900 to-teal-950 text-white space-y-4 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-400/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                                        {pacienteActual.nombre_completo.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">{pacienteActual.nombre_completo}</h3>
                                        <p className="text-xs text-teal-300">
                                            {pacienteActual.tipo_documento || 'CC'}: {pacienteActual.documento_identidad} · EPS: {pacienteActual.eps || "N/A"} · ARL: {pacienteActual.arl || "N/A"}
                                        </p>
                                    </div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Seguimiento activo
                                </span>
                            </div>

                            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Último Examen</span>
                                    <span className="font-semibold text-teal-200">
                                        {ultimaEvaluacion ? formatearFechaCorta(ultimaEvaluacion.fecha_actual) : "Sin registro"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Tipo de Examen</span>
                                    <span className="font-semibold text-slate-200">
                                        {ultimaEvaluacion?.tipo_evaluacion || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Total Evaluaciones</span>
                                    <span className="font-semibold text-teal-300">{evaluacionesPaciente.length} realizadas</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-0.5">Eventos Registrados</span>
                                    <span className="font-semibold text-amber-300">{eventos.length} registros</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFiltroTipo("todos")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtroTipo === "todos" ? "bg-teal-600 text-white shadow-md" : "bg-white border text-slate-600 hover:border-teal-300"}`}
                            >
                                Todos ({totalPorTipo.todos || 0})
                            </button>
                            {Object.entries(TIPOS_EVENTO).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setFiltroTipo(key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filtroTipo === key ? "bg-teal-600 text-white shadow-md" : "bg-white border text-slate-600 hover:border-teal-300"}`}
                                >
                                    <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: config.color }} />
                                    {config.label} ({totalPorTipo[key] || 0})
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowModal(true)} className="btn-primary text-xs py-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar Evento Clínico
                        </button>
                    </div>

                    {/* Timeline grouped by date */}
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                            <p className="text-xs mt-2">Cargando línea de tiempo...</p>
                        </div>
                    ) : eventos.length === 0 ? (
                        <div className="card-premium p-12 text-center text-slate-400">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="font-semibold text-slate-700">No hay eventos en el historial de este paciente</p>
                            <p className="text-xs text-slate-500 mt-1">Los exámenes médicos generan entradas automáticas aquí.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {eventosAgrupados.map(([fecha, eventosDelDia]) => (
                                <div key={fecha} className="relative">
                                    {/* Fecha cabecera */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-600 text-white text-xs font-bold shadow-md">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formatearFecha(fecha)}
                                        </span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-teal-200 to-transparent"></div>
                                        <span className="text-[0.65rem] text-slate-400 font-semibold">{eventosDelDia.length} evento(s)</span>
                                    </div>

                                    <div className="relative pl-6 space-y-3 border-l-2 border-teal-100 ml-5">
                                        {eventosDelDia.map((evt) => {
                                            const cfg = TIPOS_EVENTO[evt.tipo_evento as TipoEvento] || TIPOS_EVENTO.nota_clinica;
                                            return (
                                                <div key={evt.id} className="relative flex items-start gap-3 animate-fade-in group">
                                                    <span className={`absolute -left-[2.05rem] top-4 w-4 h-4 rounded-full ${cfg.ring} border-[3px] border-white shadow-md`}></span>
                                                    <div className={`flex-1 p-4 rounded-xl border ${cfg.bg} bg-white shadow-sm hover:shadow-md transition-all`}>
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-bold text-slate-900 text-sm">{evt.titulo}</span>
                                                                    <span className="badge text-[0.65rem]" style={{ background: `${cfg.color}1a`, color: cfg.color }}>
                                                                        {cfg.label}
                                                                    </span>
                                                                </div>
                                                                {evt.descripcion && (
                                                                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{evt.descripcion}</p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => eliminarEvento(evt.id)}
                                                                disabled={eliminandoId === evt.id}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold disabled:opacity-40"
                                                                title="Eliminar evento"
                                                            >
                                                                {eliminandoId === evt.id ? "..." : "🗑"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal Agregar Evento */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Agregar Evento al Historial</h3>
                                <p className="text-xs text-slate-500">
                                    {pacienteActual ? `Trabajador: ${pacienteActual.nombre_completo}` : ""}
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="label-premium">Tipo de Evento</label>
                            <select className="select-premium" value={nuevoEvento.tipo_evento} onChange={(e) => setNuevoEvento({ ...nuevoEvento, tipo_evento: e.target.value as TipoEvento })}>
                                {Object.entries(TIPOS_EVENTO).map(([k, c]) => (
                                    <option key={k} value={k}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-premium">Título *</label>
                            <input type="text" required className="input-premium" value={nuevoEvento.titulo} onChange={(e) => setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })} placeholder="Ej. Incapacidad por lumbalgia 3 días" />
                        </div>
                        <div>
                            <label className="label-premium">Fecha Evento</label>
                            <input type="date" className="input-premium" value={nuevoEvento.fecha_evento} onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha_evento: e.target.value })} />
                        </div>
                        <div>
                            <label className="label-premium">Descripción</label>
                            <textarea rows={3} className="input-premium" value={nuevoEvento.descripcion} onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })} placeholder="Detalles de la recomendación, EPS o secuela..." />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                            <button onClick={guardarEvento} className="btn-primary">Guardar Evento</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
