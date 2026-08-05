import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
    const supabase = await createClient();

    // Get time in Colombia for dynamic greeting
    const hour = parseInt(new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: 'numeric', hour12: false }));
    const isMorning = hour < 12;
    const isAfternoon = hour >= 12 && hour < 19;
    const greeting = isMorning ? "Buenos días" : isAfternoon ? "Buenas tardes" : "Buenas noches";
    const greetingEmoji = isMorning ? "🌅" : isAfternoon ? "☀️" : "🌙";

    const { count: totalPacientes } = await supabase.from("pacientes").select("*", { count: "exact", head: true });
    const { count: totalEvaluaciones } = await supabase.from("evaluaciones").select("*", { count: "exact", head: true });
    const { count: evaluacionesIngreso } = await supabase.from("evaluaciones").select("*", { count: "exact", head: true }).eq("tipo_evaluacion", "Pre ingreso");

    // Recent evaluations
    const { data: evaluacionesRecientes } = await supabase
        .from("evaluaciones")
        .select(`
            id,
            tipo_evaluacion,
            enfasis,
            fecha_actual,
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

    const conceptoBadge = (concepto: string | undefined) => {
        switch (concepto) {
            case 'Apto': return 'badge-green';
            case 'No Apto': return 'badge-red';
            case 'Apto con Restricciones': return 'badge-amber';
            default: return 'badge-slate';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* 1. Dynamic Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, var(--primary-700), var(--primary-500))' }}>
                
                {/* Decorative background circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                <div className="absolute bottom-0 right-32 -mb-16 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-medium mb-4">
                            <span>{greetingEmoji}</span>
                            <span>{greeting}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                            ¡Hola, Dra. Viviana! 👋
                        </h2>
                        <p className="mt-2 text-primary-100 max-w-xl text-sm md:text-base opacity-90">
                            Resumen general del sistema de gestión en seguridad y salud en el trabajo. Aquí tienes el estado actual de tus pacientes y evaluaciones.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Quick Actions */}
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Acciones Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/pacientes/nuevo" 
                          className="group relative overflow-hidden rounded-xl p-5 border border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg transition-all duration-300 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-blue-50 text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-transform">
                            🧑‍⚕️
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Registrar Paciente</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Crear nueva historia clínica</p>
                        </div>
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/20 rounded-xl transition-colors"></div>
                    </Link>

                    <Link href="/dashboard/evaluaciones/nueva" 
                          className="group relative overflow-hidden rounded-xl p-5 border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-lg transition-all duration-300 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-100 transition-transform">
                            📋
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Nueva Evaluación</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Iniciar examen médico</p>
                        </div>
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-500/20 rounded-xl transition-colors"></div>
                    </Link>

                    <Link href="/dashboard/timeline" 
                          className="group relative overflow-hidden rounded-xl p-5 border border-slate-200 bg-white hover:border-rose-300 hover:shadow-lg transition-all duration-300 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-rose-50 text-rose-600 group-hover:scale-110 group-hover:bg-rose-100 transition-transform">
                            📅
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800">Línea de Tiempo</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Ver eventos recientes</p>
                        </div>
                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-rose-500/20 rounded-xl transition-colors"></div>
                    </Link>
                </div>
            </div>

            {/* 3. Stats Grid */}
            <div>
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4 mt-2" style={{ color: 'var(--text-muted)' }}>Métricas Globales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="stat-card stat-card-blue animate-fade-in stagger-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    Pacientes
                                </h3>
                                <div className="flex items-end gap-2 mt-1">
                                    <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {totalPacientes || 0}
                                    </p>
                                    <span className="text-xs font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center mb-1">
                                        <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                        Activo
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner"
                                style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                                👥
                            </div>
                        </div>
                        <Link href="/dashboard/pacientes" className="text-xs font-medium mt-4 flex items-center group"
                            style={{ color: 'var(--primary-600)' }}>
                            Ir a pacientes <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>

                    <div className="stat-card stat-card-emerald animate-fade-in stagger-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    Evaluaciones
                                </h3>
                                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                    {totalEvaluaciones || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner"
                                style={{ background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                                📋
                            </div>
                        </div>
                        <Link href="/dashboard/evaluaciones" className="text-xs font-medium mt-4 flex items-center group"
                            style={{ color: 'var(--accent-600)' }}>
                            Ver todas <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>

                    <div className="stat-card stat-card-amber animate-fade-in stagger-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    De Ingreso
                                </h3>
                                <div className="flex items-end gap-2 mt-1">
                                    <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {evaluacionesIngreso || 0}
                                    </p>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner"
                                style={{ background: '#fef3c7', color: '#d97706' }}>
                                🏥
                            </div>
                        </div>
                        <Link href="/dashboard/evaluaciones/nueva" className="text-xs font-medium mt-4 flex items-center group"
                            style={{ color: '#d97706' }}>
                            Nueva evaluación <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>

                    <div className="stat-card stat-card-rose animate-fade-in stagger-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                    Timeline
                                </h3>
                                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                    {eventosRecientes?.length || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner"
                                style={{ background: '#ffe4e6', color: '#e11d48' }}>
                                📅
                            </div>
                        </div>
                        <Link href="/dashboard/timeline" className="text-xs font-medium mt-4 flex items-center group"
                            style={{ color: '#e11d48' }}>
                            Ver eventos <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Two columns: Recent evaluations + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Evaluations */}
                <div className="section-premium">
                    <div className="section-header section-header-blue">
                        <span className="text-lg">📋</span>
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
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📋</div>
                                <p className="text-sm font-medium">Sin evaluaciones registradas</p>
                                <p className="text-xs mt-1">Comienza creando una nueva evaluación.</p>
                            </div>
                        ) : (
                            evaluacionesRecientes.map((ev: any) => {
                                const initials = ev.paciente.nombre_completo.substring(0, 2).toUpperCase();
                                return (
                                    <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm">
                                                {initials}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm group-hover:text-blue-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
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
                                        <span className={`badge shadow-sm ${conceptoBadge(ev.certificado?.concepto_medico)}`}>
                                            {ev.certificado?.concepto_medico || 'Pendiente'}
                                        </span>
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
                        <span className="text-lg">📅</span>
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
                                <p className="text-2xl mb-2">📅</p>
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

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/pacientes"
                    className="card-premium p-5 flex items-center gap-4 group">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                        style={{ background: 'var(--primary-50)' }}>
                        👤
                    </div>
                    <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nuevo Paciente</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Registrar expediente médico</p>
                    </div>
                </Link>
                <Link href="/dashboard/evaluaciones/nueva"
                    className="card-premium p-5 flex items-center gap-4 group">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                        style={{ background: 'var(--accent-50)' }}>
                        🩺
                    </div>
                    <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Nueva Evaluación</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Examen médico ocupacional</p>
                    </div>
                </Link>
                <Link href="/dashboard/timeline"
                    className="card-premium p-5 flex items-center gap-4 group">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-transform group-hover:scale-110"
                        style={{ background: '#fef3c7' }}>
                        📅
                    </div>
                    <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Línea de Tiempo</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Seguimiento longitudinal</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}