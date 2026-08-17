"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import { fechaLocal } from "@/lib/fechas";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const estadoStyle: Record<string, string> = {
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    realizada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelada: "bg-red-50 text-red-600 border-red-200",
};

const estadoLabel: Record<string, string> = {
    pendiente: "Pendiente",
    realizada: "Realizada",
    cancelada: "Cancelada",
};

export default function AgendaPage() {
    const supabase = createClient();
    const hoy = new Date();
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes] = useState(hoy.getMonth());
    const [diaSeleccionado, setDiaSeleccionado] = useState<string>(
        fechaLocal(hoy)
    );

    const [citas, setCitas] = useState<any[]>([]);
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal nueva cita
    const [modalOpen, setModalOpen] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        paciente_id: "",
        fecha_cita: fechaLocal(hoy),
        hora_cita: "08:00",
        tipo_evaluacion: "Pre ingreso",
        modalidad: "Presencial",
        notas: "",
    });

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const inicio = `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
            const fin = `${anio}-${String(mes + 1).padStart(2, "0")}-31`;
            const [resCitas, resPacientes] = await Promise.all([
                supabase
                    .from("citas")
                    .select(`
                        id,
                        fecha_cita,
                        hora_cita,
                        tipo_evaluacion,
                        modalidad,
                        estado,
                        notas,
                        paciente:pacientes (
                            id,
                            nombre_completo,
                            documento_identidad,
                            movil
                        )
                    `)
                    .gte("fecha_cita", inicio)
                    .lte("fecha_cita", fin)
                    .order("fecha_cita", { ascending: true }),
                supabase.from("pacientes").select("id, nombre_completo, documento_identidad").order("nombre_completo"),
            ]);
            if (resCitas.error) throw resCitas.error;
            setCitas(resCitas.data || []);
            setPacientes(resPacientes.data || []);
        } catch (err: any) {
            console.error("Error cargando agenda:", err);
            toast.error(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anio, mes]);

    // Generar celdas del calendario (lunes a domingo)
    const celdas = useMemo(() => {
        const primerDia = new Date(anio, mes, 1);
        // JS: getDay() 0=domingo -> ajustar a lunes=0
        const offset = (primerDia.getDay() + 6) % 7;
        const diasEnMes = new Date(anio, mes + 1, 0).getDate();
        const celdasArr: (string | null)[] = [];
        for (let i = 0; i < offset; i++) celdasArr.push(null);
        for (let d = 1; d <= diasEnMes; d++) {
            celdasArr.push(`${anio}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
        }
        return celdasArr;
    }, [anio, mes]);

    const citasPorDia = useMemo(() => {
        const mapa: Record<string, any[]> = {};
        citas.forEach((c) => {
            const k = c.fecha_cita;
            if (!mapa[k]) mapa[k] = [];
            mapa[k].push(c);
        });
        return mapa;
    }, [citas]);

    const citasDelDia = citasPorDia[diaSeleccionado] || [];
    const esHoy = (fecha: string) => fecha === fechaLocal(hoy);

    const crearCita = async () => {
        if (!form.paciente_id) return toast.error("Seleccione un paciente.");
        setGuardando(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("citas").insert({
                ...form,
                created_by: user?.id,
            });
            if (error) throw error;
            toast.success("Cita agendada.");
            setModalOpen(false);
            setForm({ ...form, paciente_id: "" });
            cargarDatos();
        } catch (err: any) {
            console.error("Error creando cita:", err);
            toast.error(`Error: ${err.message}`);
        } finally {
            setGuardando(false);
        }
    };

    const cambiarEstado = async (cita: any, estado: string) => {
        try {
            const { error } = await supabase.from("citas").update({ estado }).eq("id", cita.id);
            if (error) throw error;
            toast.success(`Cita marcada como ${estadoLabel[estado] || estado}.`);
            cargarDatos();
        } catch (err: any) {
            console.error("Error actualizando cita:", err);
            toast.error(`Error: ${err.message}`);
        }
    };

    const eliminarCita = async (cita: any) => {
        if (!confirm(`¿Eliminar la cita de ${cita.paciente?.nombre_completo}?`)) return;
        try {
            const { error } = await supabase.from("citas").delete().eq("id", cita.id);
            if (error) throw error;
            toast.success("Cita eliminada.");
            cargarDatos();
        } catch (err: any) {
            console.error("Error eliminando cita:", err);
            toast.error(`Error: ${err.message}`);
        }
    };

    const citasPendientes = citas.filter((c) => c.estado === "pendiente").length;
    const citasRealizadas = citas.filter((c) => c.estado === "realizada").length;

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                icono={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                }
                titulo="Agenda de Citas"
                subtitulo="Programación de evaluaciones médicas ocupacionales"
                acciones={
                    <button onClick={() => setModalOpen(true)} className="btn-primary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Cita
                    </button>
                }
            />

            {/* Resumen del mes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card-premium p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{citasPendientes}</p>
                        <p className="text-[0.65rem] font-bold uppercase text-slate-400">Pendientes este mes</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{citasRealizadas}</p>
                        <p className="text-[0.65rem] font-bold uppercase text-slate-400">Realizadas este mes</p>
                    </div>
                </div>
                <div className="card-premium p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{citas.length}</p>
                        <p className="text-[0.65rem] font-bold uppercase text-slate-400">Citas en el mes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendario */}
                <div className="lg:col-span-2 section-premium p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-900">{MESES[mes]} {anio}</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { if (mes === 0) { setMes(11); setAnio(anio - 1); } else setMes(mes - 1); }}
                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => { const t = new Date(); setMes(t.getMonth()); setAnio(t.getFullYear()); }}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-teal-400 hover:text-teal-600 transition-colors"
                            >
                                Hoy
                            </button>
                            <button
                                onClick={() => { if (mes === 11) { setMes(0); setAnio(anio + 1); } else setMes(mes + 1); }}
                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                        {DIAS.map((d) => (
                            <div key={d} className="text-center text-[0.65rem] font-bold text-slate-400 py-1">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                        {celdas.map((fecha, i) => {
                            if (!fecha) return <div key={`e-${i}`} className="min-h-[76px] rounded-lg bg-slate-50/60"></div>;
                            const diaNum = parseInt(fecha.split("-")[2]);
                            const delDia = citasPorDia[fecha] || [];
                            const seleccionado = fecha === diaSeleccionado;
                            return (
                                <button
                                    key={fecha}
                                    onClick={() => setDiaSeleccionado(fecha)}
                                    className={`min-h-[76px] rounded-lg border p-1.5 text-left transition-all ${
                                        seleccionado
                                            ? "border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-500/20"
                                            : esHoy(fecha)
                                                ? "border-teal-300 bg-teal-50/60 hover:bg-teal-50"
                                                : "border-slate-200 bg-white hover:border-teal-300"
                                    }`}
                                >
                                    <span className={`text-xs font-bold ${seleccionado ? "text-teal-800" : esHoy(fecha) ? "text-teal-700" : "text-slate-600"}`}>
                                        {diaNum}
                                    </span>
                                    <div className="mt-1 space-y-1">
                                        {delDia.slice(0, 3).map((c: any) => (
                                            <div
                                                key={c.id}
                                                className={`text-[0.55rem] leading-tight px-1 py-0.5 rounded truncate font-semibold ${
                                                    c.estado === "cancelada"
                                                        ? "bg-red-50 text-red-500 line-through"
                                                        : c.estado === "realizada"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-teal-100 text-teal-800"
                                                }`}
                                            >
                                                {c.hora_cita?.slice(0, 5)} {c.paciente?.nombre_completo?.split(" ")[0]}
                                            </div>
                                        ))}
                                        {delDia.length > 3 && (
                                            <div className="text-[0.55rem] text-slate-400 font-bold text-center">+{delDia.length - 3} más</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Citas del día */}
                <div className="section-premium overflow-hidden">
                    <div className="section-header section-header-blue">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                            <h3 className="text-sm font-bold text-teal-900">
                                {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                            </h3>
                            <p className="text-[0.65rem] text-teal-600">{citasDelDia.length} citas</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {citasDelDia.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <p className="text-3xl mb-2">🗓️</p>
                                <p className="font-semibold text-sm">Sin citas este día</p>
                                <button onClick={() => { setForm({ ...form, fecha_cita: diaSeleccionado }); setModalOpen(true); }} className="btn-primary text-xs mt-3">
                                    + Agendar aquí
                                </button>
                            </div>
                        ) : (
                            citasDelDia.map((c: any) => (
                                <div key={c.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                                                {c.hora_cita?.slice(0, 5) || "--:--"}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold border ${estadoStyle[c.estado] || estadoStyle.pendiente}`}>
                                                {estadoLabel[c.estado] || "Pendiente"}
                                            </span>
                                        </div>
                                        <button onClick={() => eliminarCita(c)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="font-bold text-slate-900 text-sm">{c.paciente?.nombre_completo}</p>
                                        {c.paciente_id && (
                                            <Link
                                                href={`/dashboard/pacientes/${c.paciente_id}`}
                                                className="text-[0.65rem] text-teal-600 font-semibold hover:underline shrink-0"
                                            >
                                                Ver perfil →
                                            </Link>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {c.tipo_evaluacion} · {c.modalidad} · CC {c.paciente?.documento_identidad}
                                    </p>
                                    {c.notas && <p className="text-xs text-slate-400 mt-1 italic">{c.notas}</p>}
                                    {c.estado !== "realizada" && c.estado !== "cancelada" && (
                                        <div className="flex gap-2 mt-3">
                                            <Link
                                                href={`/dashboard/evaluaciones/nueva?paciente_id=${c.paciente_id}&tipo=${encodeURIComponent(c.tipo_evaluacion || "Pre ingreso")}`}
                                                className="flex-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors text-center"
                                            >
                                                🏥 Iniciar Evaluación
                                            </Link>
                                            <button
                                                onClick={() => cambiarEstado(c, "realizada")}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                                            >
                                                ✓ Realizada
                                            </button>
                                            <button
                                                onClick={() => cambiarEstado(c, "cancelada")}
                                                className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-3 text-center border-t border-slate-100">
                        {(() => {
                            const pendiente = citasDelDia.find((c: any) => c.estado === "pendiente");
                            return pendiente ? (
                                <Link href={`/dashboard/evaluaciones/nueva?paciente_id=${pendiente.paciente_id}`} className="text-xs font-semibold text-teal-600 hover:text-teal-800">
                                    Iniciar evaluación de {pendiente.paciente?.nombre_completo?.split(" ")[0]} →
                                </Link>
                            ) : (
                                <span className="text-xs text-slate-400">Sin citas pendientes este día para iniciar evaluación</span>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Modal nueva cita */}
            <Modal
                abierto={modalOpen}
                onCerrar={() => setModalOpen(false)}
                titulo="Nueva Cita"
                footer={
                    <>
                        <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                        <button onClick={crearCita} disabled={guardando} className="btn-primary">
                            {guardando ? "Agendando..." : "Agendar cita"}
                        </button>
                    </>
                }
            >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label-premium">Paciente *</label>
                                <select className="select-premium" value={form.paciente_id} onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}>
                                    <option value="">— Seleccione un paciente —</option>
                                    {pacientes.map((p) => (
                                        <option key={p.id} value={p.id}>{p.documento_identidad} — {p.nombre_completo}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Fecha</label>
                                <input type="date" className="input-premium" value={form.fecha_cita} onChange={(e) => setForm({ ...form, fecha_cita: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Hora</label>
                                <input type="time" className="input-premium" value={form.hora_cita} onChange={(e) => setForm({ ...form, hora_cita: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Tipo de examen</label>
                                <select className="select-premium" value={form.tipo_evaluacion} onChange={(e) => setForm({ ...form, tipo_evaluacion: e.target.value })}>
                                    <option value="Pre ingreso">Pre ingreso</option>
                                    <option value="Periódico">Periódico</option>
                                    <option value="Egreso">Egreso</option>
                                    <option value="Post incapacidad">Post incapacidad</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Modalidad</label>
                                <select className="select-premium" value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value })}>
                                    <option value="Presencial">Presencial</option>
                                    <option value="Virtual">Virtual (Telemedicina)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-premium">Notas</label>
                                <textarea rows={2} className="input-premium" placeholder="Indicaciones, exámenes solicitados, etc." value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
                            </div>
                </div>
            </Modal>
        </div>
    );
}
