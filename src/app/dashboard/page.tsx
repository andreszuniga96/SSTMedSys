import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
    const supabase = await createClient();

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
        <div className="space-y-6 animate-fade-in">
            {/* Welcome header */}
            <div className="card-premium p-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Panel de Control
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Resumen general del sistema de gestión en seguridad y salud en el trabajo
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card stat-card-blue animate-fade-in stagger-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Pacientes
                            </h3>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {totalPacientes || 0}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                            👥
                        </div>
                    </div>
                    <Link href="/dashboard/pacientes" className="text-xs font-medium mt-3 inline-block"
                        style={{ color: 'var(--primary-600)' }}>
                        Registrar nuevo →
                    </Link>
                </div>

                <div className="stat-card stat-card-emerald animate-fade-in stagger-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Evaluaciones Totales
                            </h3>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {totalEvaluaciones || 0}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: 'var(--accent-50)', color: 'var(--accent-600)' }}>
                            📋
                        </div>
                    </div>
                    <Link href="/dashboard/evaluaciones" className="text-xs font-medium mt-3 inline-block"
                        style={{ color: 'var(--accent-600)' }}>
                        Ver todas →
                    </Link>
                </div>

                <div className="stat-card stat-card-amber animate-fade-in stagger-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Exámenes de Ingreso
                            </h3>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {evaluacionesIngreso || 0}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: '#fef3c7', color: '#d97706' }}>
                            🏥
                        </div>
                    </div>
                    <Link href="/dashboard/evaluaciones/nueva" className="text-xs font-medium mt-3 inline-block"
                        style={{ color: '#d97706' }}>
                        Nueva evaluación →
                    </Link>
                </div>

                <div className="stat-card stat-card-rose animate-fade-in stagger-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Timeline
                            </h3>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {eventosRecientes?.length || 0}
                            </p>
                            <p className="text-[0.65rem]" style={{ color: 'var(--text-muted)' }}>eventos recientes</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: '#ffe4e6', color: '#e11d48' }}>
                            📅
                        </div>
                    </div>
                    <Link href="/dashboard/timeline" className="text-xs font-medium mt-3 inline-block"
                        style={{ color: '#e11d48' }}>
                        Ver timeline →
                    </Link>
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
                            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                <p className="text-2xl mb-2">📋</p>
                                <p className="text-sm">Sin evaluaciones registradas</p>
                            </div>
                        ) : (
                            evaluacionesRecientes.map((ev: any) => (
                                <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {ev.paciente.nombre_completo}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(ev.fecha_actual).toLocaleDateString('es-CO')} · {ev.tipo_evaluacion} · {ev.enfasis || 'General'}
                                        </p>
                                    </div>
                                    <span className={`badge ${conceptoBadge(ev.certificado?.concepto_medico)}`}>
                                        {ev.certificado?.concepto_medico || 'Pendiente'}
                                    </span>
                                </div>
                            ))
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