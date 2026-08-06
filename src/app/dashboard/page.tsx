import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ConceptoBadge from "@/components/dashboard/ConceptoBadge";
import AlertaVigencia from "@/components/dashboard/AlertaVigencia";
import { examenMasRecientePorPaciente, clasificarPorVigencia } from "@/lib/vigencia";

// Iconos SVG (Heroicons outline) — sin emojis, estilo profesional
const IconPacientes = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const IconClipboard = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const IconTimeline = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconBuilding = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const IconPulse = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
);

export default async function DashboardPage() {
    const supabase = await createClient();

    // Get time in Colombia for dynamic greeting
    const hour = parseInt(new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: 'numeric', hour12: false }));
    const isMorning = hour < 12;
    const isAfternoon = hour >= 12 && hour < 19;
    const greeting = isMorning ? "Buenos días" : isAfternoon ? "Buenas tardes" : "Buenas noches";

    const { count: totalPacientes } = await supabase.from("pacientes").select("*", { count: "exact", head: true });
    const { count: totalEvaluaciones } = await supabase.from("evaluaciones").select("*", { count: "exact", head: true });
    const { count: pacientesVirtuales } = await supabase.from("pacientes").select("*", { count: "exact", head: true }).eq("origen", "virtual");
    const { count: solicitudesPendientes } = await supabase.from("solicitudes_preatencion").select("*", { count: "exact", head: true }).neq("estado", "procesada");

    // Recent evaluations
    const { data: evaluacionesRecientes } = await supabase
        .from("evaluaciones")
        .select(`
            id,
            tipo_evaluacion,
            enfasis,
            fecha_actual,
            modalidad,
            paciente:pacientes (
                nombre_completo,
                documento_identidad
            ),
            certificado:certificados_aptitud (
                concepto_medico
            )
        `)
        .order('fecha_actual', { ascending: false })
        .limit(5);

    // Recent timeline events
    const { data: eventosRecientes } = await supabase
        .from("timeline_eventos")
        .select(`
            id,
            tipo_evento,
            titulo,
            fecha_evento,
            paciente:pacientes (
                nombre_completo
            )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    // ===== VIGENCIA / RENOVACIÓN: exámenes por vencer y vencidos =====
    const { data: todasEvaluaciones } = await supabase
        .from("evaluaciones")
        .select(`
            id,
            fecha_actual,
            vigencia_meses,
            tipo_evaluacion,
            paciente:pacientes (
                id,
                nombre_completo,
                documento_identidad
            ),
            certificado:certificados_aptitud (
                concepto_medico
            )
        `)
        .order("fecha_actual", { ascending: false })
        .limit(500);

    // Por cada paciente, el examen más reciente con certificado define su vigencia
    const porPaciente = examenMasRecientePorPaciente(todasEvaluaciones || []);

    const { porVencer, vencidos } = clasificarPorVigencia([...porPaciente.values()]);

    const TIPO_EMOJI: Record<string, string> = {
        evaluacion_medica: "🏥",
        incapacidad: "🤕",
        accidente_laboral: "⚠️",
        enfermedad_profesional: "🦠",
        cambio_cargo: "💼",
        capacitacion: "📚",
        vacunacion: "💉",
        examen_complementario: "🔬",
        nota_clinica: "📝",
    };

    const accionesRapidas = [
        {
            href: "/dashboard/pacientes/nuevo",
            titulo: "Registrar Paciente",
            desc: "Crear nueva historia clínica",
            icon: <IconPacientes />,
            color: "from-teal-500 to-cyan-600",
            bg: "bg-teal-50 text-teal-700",
            hover: "group-hover:bg-teal-100",
        },
        {
            href: "/dashboard/evaluaciones/nueva",
            titulo: "Nueva Evaluación",
            desc: "Iniciar examen médico ocupacional",
            icon: <IconClipboard />,
            color: "from-emerald-500 to-green-600",
            bg: "bg-emerald-50 text-emerald-700",
            hover: "group-hover:bg-emerald-100",
        },
        {
            href: "/dashboard/pacientes",
            titulo: "Portal Pre-Atención",
            desc: "Pacientes virtuales y solicitudes",
            icon: <IconPulse />,
            color: "from-cyan-500 to-sky-600",
            bg: "bg-cyan-50 text-cyan-700",
            hover: "group-hover:bg-cyan-100",
        },
    ];

    const kpis = [
        {
            titulo: "Pacientes",
            valor: totalPacientes || 0,
            icon: <IconPacientes />,
            bg: "var(--primary-50)",
            color: "var(--primary-700)",
            href: "/dashboard/pacientes",
            enlace: "Ir a pacientes",
            stat: "stat-card-blue",
            badge: { texto: "Registrados", cls: "bg-teal-50 text-teal-600" },
        },
        {
            titulo: "Evaluaciones",
            valor: totalEvaluaciones || 0,
            icon: <IconClipboard />,
            bg: "var(--accent-50)",
            color: "var(--accent-600)",
            href: "/dashboard/evaluaciones",
            enlace: "Ver todas",
            stat: "stat-card-emerald",
            badge: { texto: "Totales", cls: "bg-green-50 text-green-600" },
        },
        {
            titulo: "Telemedicina",
            valor: pacientesVirtuales || 0,
            icon: <IconPulse />,
            bg: "#e0f2fe",
            color: "#0369a1",
            href: "/dashboard/pacientes",
            enlace: "Pacientes virtuales",
            stat: "stat-card-amber",
            badge: { texto: "Virtuales", cls: "bg-sky-50 text-sky-600" },
        },
        {
            titulo: "Solicitudes",
            valor: solicitudesPendientes || 0,
            icon: <IconBuilding />,
            bg: "#fef3c7",
            color: "#d97706",
            href: "/dashboard/timeline",
            enlace: "Pre-atención",
            stat: "stat-card-rose",
            badge: { texto: "Por procesar", cls: "bg-amber-50 text-amber-600" },
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* 1. Dynamic Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, #134e4a 0%, #0d9488 55%, #0e7490 100%)' }}>

                {/* Decorative background circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                <div className="absolute bottom-0 right-32 -mb-16 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl"></div>
                <div className="absolute top-8 left-1/3 w-40 h-40 rounded-full bg-cyan-300/10 blur-2xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-sm font-medium mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <span>{greeting} · Hora de Colombia</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                            ¡Hola, Dra. Viviana!
                        </h2>
                        <p className="mt-2 text-teal-50 max-w-xl text-sm md:text-base opacity-90">
                            Resumen general del sistema de gestión en seguridad y salud en el trabajo. Aquí tienes el estado actual de tus pacientes, evaluaciones y solicitudes de telemedicina.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <Link href="/dashboard/evaluaciones/nueva" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-teal-800 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Nueva Evaluación
                        </Link>
                        <Link href="/dashboard/pacientes" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-sm backdrop-blur-sm">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Gestión de Pacientes
                        </Link>
                    </div>
                </div>
            </div>

            {/* 2. Quick Actions */}
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Acciones Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {accionesRapidas.map((a) => (
                        <Link key={a.href} href={a.href}
                            className="group relative overflow-hidden rounded-xl p-5 border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 flex items-center gap-4 hover:border-teal-300">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${a.bg} ${a.hover} group-hover:scale-110 transition-transform`}>
                                {a.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{a.titulo}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
                            </div>
                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-teal-500/20 rounded-xl transition-colors"></div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* 3. Stats Grid */}
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 mt-2" style={{ color: 'var(--text-muted)' }}>Métricas Globales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpis.map((k, i) => (
                        <div key={k.titulo} className={`stat-card ${k.stat} animate-fade-in stagger-${i + 1} relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-xl" style={{ background: `${k.color}14` }}></div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        {k.titulo}
                                    </h3>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {k.valor}
                                        </p>
                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded mb-1 ${k.badge.cls}`}>
                                            {k.badge.texto}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ background: k.bg, color: k.color }}>
                                    {k.icon}
                                </div>
                            </div>
                            <Link href={k.href} className="text-xs font-medium mt-4 flex items-center group" style={{ color: k.color }}>
                                {k.enlace} <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Alerta de vigencia: exámenes por vencer y vencidos */}
            <AlertaVigencia vencidos={vencidos} porVencer={porVencer} />

            {/* Two columns: Recent evaluations + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Evaluations */}
                <div className="section-premium">
                    <div className="section-header section-header-blue">
                        <IconClipboard />
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--primary-800)' }}>
                                Evaluaciones Recientes
                            </h3>
                            <p className="text-[0.65rem]" style={{ color: 'var(--primary-600)' }}>
                                Últimas 5 evaluaciones procesadas
                            </p>
                        </div>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                        {!evaluacionesRecientes || evaluacionesRecientes.length === 0 ? (
                            <div className="p-10 text-center" style={{ color: 'var(--text-muted)' }}>
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-teal-400">
                                    <IconClipboard />
                                </div>
                                <p className="text-sm font-medium">Sin evaluaciones registradas</p>
                                <p className="text-xs mt-1">Comienza creando una nueva evaluación.</p>
                            </div>
                        ) : (
                            evaluacionesRecientes.map((ev: any) => {
                                const initials = ev.paciente.nombre_completo.substring(0, 2).toUpperCase();
                                return (
                                    <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-teal-200 text-teal-800 flex items-center justify-center font-bold text-sm shadow-sm">
                                                {initials}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm group-hover:text-teal-700 transition-colors" style={{ color: 'var(--text-primary)' }}>
                                                    {ev.paciente.nombre_completo}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                                        {new Date(ev.fecha_actual).toLocaleDateString('es-CO')}
                                                    </span>
                                                    <span className="text-[0.65rem] text-slate-500">
                                                        • {ev.tipo_evaluacion} {ev.enfasis ? `(${ev.enfasis})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ConceptoBadge concepto={ev.certificado?.concepto_medico} sombra />
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="p-3 text-center border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <Link href="/dashboard/evaluaciones" className="text-xs font-semibold" style={{ color: 'var(--primary-600)' }}>
                            Ver todas las evaluaciones →
                        </Link>
                    </div>
                </div>

                {/* Recent Timeline */}
                <div className="section-premium">
                    <div className="section-header section-header-emerald">
                        <IconTimeline />
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: '#065f46' }}>
                                Línea de Tiempo Reciente
                            </h3>
                            <p className="text-[0.65rem]" style={{ color: '#059669' }}>
                                Últimos eventos registrados
                            </p>
                        </div>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                        {!eventosRecientes || eventosRecientes.length === 0 ? (
                            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-slate-50 flex items-center justify-center text-teal-400">
                                    <IconTimeline />
                                </div>
                                <p className="text-sm">Sin eventos en el timeline</p>
                            </div>
                        ) : (
                            eventosRecientes.map((evento: any) => (
                                <div key={evento.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                                    <span className="text-lg flex-shrink-0">
                                        {TIPO_EMOJI[evento.tipo_evento] || "📝"}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {evento.titulo}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {evento.paciente?.nombre_completo} · {new Date(evento.fecha_evento).toLocaleDateString('es-CO')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-3 text-center border-t" style={{ borderColor: 'var(--border-light)' }}>
                        <Link href="/dashboard/timeline" className="text-xs font-semibold" style={{ color: '#059669' }}>
                            Ver timeline completo →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
