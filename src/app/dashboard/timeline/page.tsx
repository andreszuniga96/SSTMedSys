"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const TIPOS_EVENTO = {
    evaluacion_medica: { emoji: "🏥", color: "bg-blue-500", label: "Evaluación Médica", bg: "bg-blue-50 border-blue-200" },
    incapacidad: { emoji: "🤕", color: "bg-amber-500", label: "Incapacidad", bg: "bg-amber-50 border-amber-200" },
    accidente_laboral: { emoji: "⚠️", color: "bg-red-500", label: "Accidente Laboral", bg: "bg-red-50 border-red-200" },
    enfermedad_profesional: { emoji: "🦠", color: "bg-purple-500", label: "Enfermedad Profesional", bg: "bg-purple-50 border-purple-200" },
    cambio_cargo: { emoji: "💼", color: "bg-emerald-500", label: "Cambio de Cargo", bg: "bg-emerald-50 border-emerald-200" },
    capacitacion: { emoji: "📚", color: "bg-indigo-500", label: "Capacitación SST", bg: "bg-indigo-50 border-indigo-200" },
    vacunacion: { emoji: "💉", color: "bg-teal-500", label: "Vacunación", bg: "bg-teal-50 border-teal-200" },
    examen_complementario: { emoji: "🔬", color: "bg-cyan-500", label: "Examen Complementario", bg: "bg-cyan-50 border-cyan-200" },
    nota_clinica: { emoji: "📝", color: "bg-slate-500", label: "Nota Clínica", bg: "bg-slate-50 border-slate-200" },
};

type TipoEvento = keyof typeof TIPOS_EVENTO;

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

    // Form
    const [nuevoEvento, setNuevoEvento] = useState({
        tipo_evento: "nota_clinica" as TipoEvento,
        titulo: "",
        descripcion: "",
        fecha_evento: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from("pacientes").select("*");
            if (data) setPacientes(data);
        };
        fetch();
    }, [supabase]);

    const cargarDatosPaciente = useCallback(async (pid: string) => {
        if (!pid) return;
        setLoading(true);

        // Fetch events
        let query = supabase.from("timeline_eventos")
            .select("*")
            .eq("paciente_id", pid)
            .order("fecha_evento", { ascending: false });

        if (filtroTipo !== "todos") {
            query = query.eq("tipo_evento", filtroTipo);
        }

        const { data: evs } = await query;
        setEventos(evs || []);

        // Fetch patient evaluations
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

    const pacienteFiltrado = busqueda.length >= 2
        ? pacientes.filter((p) =>
            p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.documento_identidad.includes(busqueda)
        )
        : pacientes;

    const pacienteActual = pacientes.find((p) => p.id === pacienteId);
    const ultimaEvaluacion = evaluacionesPaciente.length > 0 ? evaluacionesPaciente[0] : null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        Línea de Tiempo Ocupacional (Seguimiento Longitudinal)
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Historial clínico longitudinal y evolución médica del trabajador
                    </p>
                </div>
            </div>

            {/* Patient Selector */}
            <div className="section-premium">
                <div className="section-header section-header-blue">
                    <span className="text-lg">👤</span>
                    <h3 className="text-sm font-bold text-blue-900">Seleccionar Trabajador para Auditoría Médica</h3>
                </div>
                <div className="section-body space-y-3">
                    <input
                        type="text"
                        className="input-premium"
                        placeholder="Buscar por nombre o documento..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <select
                        className="select-premium font-bold text-blue-900"
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
                        <div className="card-premium p-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white space-y-4 shadow-xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl">
                                        {pacienteActual.nombre_completo.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">{pacienteActual.nombre_completo}</h3>
                                        <p className="text-xs text-blue-300">
                                            {pacienteActual.tipo_documento || 'CC'}: {pacienteActual.documento_identidad} · EPS: {pacienteActual.eps} · ARL: {pacienteActual.arl}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                        Estado: Activo
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Último Examen Ocupacional</span>
                                    <span className="font-semibold text-slate-200">
                                        {ultimaEvaluacion ? new Date(ultimaEvaluacion.fecha_actual).toLocaleDateString('es-CO') : "Sin registro"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Tipo de Examen</span>
                                    <span className="font-semibold text-slate-200">
                                        {ultimaEvaluacion?.tipo_evaluacion || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Total Evaluaciones</span>
                                    <span className="font-semibold text-blue-400">{evaluacionesPaciente.length} realizadas</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Eventos Registrados</span>
                                    <span className="font-semibold text-amber-400">{eventos.length} registros</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFiltroTipo("todos")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtroTipo === "todos" ? "bg-blue-600 text-white" : "bg-white border text-slate-600"}`}
                            >
                                Todos ({eventos.length})
                            </button>
                            {Object.entries(TIPOS_EVENTO).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setFiltroTipo(key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filtroTipo === key ? "bg-blue-600 text-white" : "bg-white border text-slate-600"}`}
                                >
                                    {config.emoji} {config.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowModal(true)} className="btn-primary text-xs py-2">
                            + Agregar Evento Clínico
                        </button>
                    </div>

                    {/* Timeline Event list */}
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Cargando línea de tiempo...</div>
                    ) : eventos.length === 0 ? (
                        <div className="card-premium p-12 text-center text-slate-400">
                            <p className="text-4xl mb-2">📅</p>
                            <p className="font-semibold text-slate-700">No hay eventos en el historial de este paciente</p>
                            <p className="text-xs text-slate-500 mt-1">Los exámenes médicos generan entradas automáticas aquí.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 space-y-4">
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
                            {eventos.map((evt) => {
                                const cfg = TIPOS_EVENTO[evt.tipo_evento as TipoEvento] || TIPOS_EVENTO.nota_clinica;
                                return (
                                    <div key={evt.id} className="relative flex items-start gap-4 animate-fade-in">
                                        <div className={`w-7 h-7 rounded-full ${cfg.color} text-white flex items-center justify-center text-xs font-bold absolute -left-7 border-2 border-white shadow-sm`}>
                                            {cfg.emoji}
                                        </div>
                                        <div className={`flex-1 p-4 rounded-xl border ${cfg.bg} bg-white shadow-sm hover:shadow-md transition-all`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 text-sm">{evt.titulo}</span>
                                                        <span className="badge badge-blue text-[0.65rem]">{cfg.label}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-1">{evt.descripcion}</p>
                                                </div>
                                                <span className="text-[0.7rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {new Date(evt.fecha_evento).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Modal Agregar Evento */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900">Agregar Evento al Historial</h3>
                        <div>
                            <label className="label-premium">Tipo de Evento</label>
                            <select className="select-premium" value={nuevoEvento.tipo_evento} onChange={(e) => setNuevoEvento({ ...nuevoEvento, tipo_evento: e.target.value as TipoEvento })}>
                                {Object.entries(TIPOS_EVENTO).map(([k, c]) => (
                                    <option key={k} value={k}>{c.emoji} {c.label}</option>
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
