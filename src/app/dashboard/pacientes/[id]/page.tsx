import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import ConceptoBadge from "@/components/dashboard/ConceptoBadge";
import { calcularVencimiento } from "@/lib/vigencia";

interface PacientePageProps {
    params: Promise<{ id: string }>;
}

function calcularEdad(fechaNacimiento: string | null): string {
    if (!fechaNacimiento) return "—";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return `${edad} años`;
}

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

export default async function PerfilPacientePage({ params }: PacientePageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Cargar datos del paciente
    const { data: paciente, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !paciente) {
        notFound();
    }

    // Cargar evaluaciones con certificados y contexto
    const { data: evaluaciones } = await supabase
        .from("evaluaciones")
        .select(`
            id,
            tipo_evaluacion,
            enfasis,
            fecha_actual,
            modalidad,
            vigencia_meses,
            examen_nombre,
            certificado:certificados_aptitud (
                concepto_medico,
                restricciones,
                recomendaciones_generales,
                firma_paciente_url
            )
        `)
        .eq("paciente_id", id)
        .order("fecha_actual", { ascending: false });

    // Cargar timeline
    const { data: timeline } = await supabase
        .from("timeline_eventos")
        .select("id, tipo_evento, titulo, descripcion, fecha_evento")
        .eq("paciente_id", id)
        .order("fecha_evento", { ascending: false })
        .limit(10);

    // Contexto laboral más reciente
    const { data: contextos } = await supabase
        .from("contexto_laboral")
        .select("empresa_nombre, empresa_nit, cargo, fecha_ingreso, lugar_realizacion")
        .eq("paciente_id", id)
        .order("created_at", { ascending: false })
        .limit(3);

    const contextoActual = contextos?.[0] ?? null;

    // Vigencia del último examen con certificado
    const ultimoConCertificado = (evaluaciones || []).find(
        (ev) => (ev.certificado as any)?.concepto_medico
    );
    const vigencia = ultimoConCertificado
        ? calcularVencimiento(ultimoConCertificado.fecha_actual, ultimoConCertificado.vigencia_meses)
        : null;

    const totalEvaluaciones = evaluaciones?.length ?? 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    {paciente.foto_url ? (
                        <img
                            src={paciente.foto_url}
                            alt={paciente.nombre_completo}
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-200 shadow-lg"
                        />
                    ) : (
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                            style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
                        >
                            {paciente.nombre_completo?.charAt(0).toUpperCase() ?? "P"}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900">{paciente.nombre_completo}</h1>
                            {paciente.origen === "virtual" && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                                    Telemedicina
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {paciente.tipo_documento ?? "CC"} {paciente.documento_identidad} ·{" "}
                            {calcularEdad(paciente.fecha_nacimiento)} · {paciente.genero ?? "—"}
                        </p>
                        {contextoActual && (
                            <p className="text-xs text-teal-700 font-medium mt-1">
                                {contextoActual.cargo || "Sin cargo"} en{" "}
                                {contextoActual.empresa_nombre || "Empresa no registrada"}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link
                        href={`/dashboard/evaluaciones/nueva?paciente_id=${id}`}
                        className="btn-primary text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Evaluación
                    </Link>
                    <Link
                        href={`/dashboard/pacientes/${id}/editar`}
                        className="btn-secondary text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                    </Link>
                    <Link href="/dashboard/pacientes" className="btn-secondary text-sm">
                        ← Volver
                    </Link>
                </div>
            </div>

            {/* Vigencia del examen */}
            {vigencia && (
                <div
                    className={`rounded-xl p-4 border flex items-center gap-3 ${
                        vigencia.vencido
                            ? "bg-red-50 border-red-200"
                            : vigencia.dias <= 60
                            ? "bg-amber-50 border-amber-200"
                            : "bg-emerald-50 border-emerald-200"
                    }`}
                >
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            vigencia.vencido
                                ? "bg-red-100 text-red-600"
                                : vigencia.dias <= 60
                                ? "bg-amber-100 text-amber-600"
                                : "bg-emerald-100 text-emerald-600"
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${vigencia.vencido ? "text-red-800" : vigencia.dias <= 60 ? "text-amber-800" : "text-emerald-800"}`}>
                            {vigencia.vencido
                                ? `⚠️ Examen VENCIDO hace ${Math.abs(vigencia.dias)} día(s)`
                                : vigencia.dias === 0
                                ? "⚠️ Examen vence HOY"
                                : vigencia.dias <= 60
                                ? `⏳ Examen por vencer en ${vigencia.dias} día(s)`
                                : `✅ Examen vigente — vence en ${vigencia.dias} días`}
                        </p>
                        <p className={`text-xs mt-0.5 ${vigencia.vencido ? "text-red-600" : vigencia.dias <= 60 ? "text-amber-600" : "text-emerald-600"}`}>
                            Fecha de vencimiento: {vigencia.venceEn.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                    </div>
                    {(vigencia.vencido || vigencia.dias <= 60) && (
                        <Link
                            href={`/dashboard/evaluaciones/nueva?paciente_id=${id}`}
                            className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-current shadow-sm hover:shadow transition-shadow shrink-0"
                            style={{ color: vigencia.vencido ? "#dc2626" : "#d97706" }}
                        >
                            Renovar →
                        </Link>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Datos personales */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="section-premium">
                        <div className="section-header section-header-blue">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h3 className="text-sm font-bold text-blue-900">Datos Personales</h3>
                        </div>
                        <div className="section-body space-y-2 text-sm">
                            {[
                                { label: "Fecha nac.", value: paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-CO") : "—" },
                                { label: "Edad", value: calcularEdad(paciente.fecha_nacimiento) },
                                { label: "Teléfono", value: paciente.movil || paciente.telefono_fijo || "—" },
                                { label: "Correo", value: paciente.correo_electronico || "—" },
                                { label: "Dirección", value: paciente.direccion || "—" },
                                { label: "Ciudad", value: paciente.lugar_residencia || "—" },
                                { label: "Estado civil", value: paciente.estado_civil || "—" },
                                { label: "Escolaridad", value: paciente.escolaridad || "—" },
                                { label: "Grupo sanguíneo", value: paciente.grupo_sanguineo || "—" },
                                { label: "IMC", value: paciente.imc ? `${paciente.imc} kg/m²` : "—" },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                                    <span className="text-slate-500 font-medium shrink-0">{label}</span>
                                    <span className="text-slate-800 text-right font-semibold text-xs">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="section-premium">
                        <div className="section-header section-header-emerald">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <h3 className="text-sm font-bold text-emerald-900">Datos de Salud</h3>
                        </div>
                        <div className="section-body space-y-2 text-sm">
                            {[
                                { label: "EPS", value: paciente.eps || "—" },
                                { label: "ARL", value: paciente.arl || "—" },
                                { label: "Régimen", value: paciente.regimen || "—" },
                                { label: "Fondo pensión", value: paciente.fondo_pension || "—" },
                                { label: "Profesión", value: paciente.profesion || "—" },
                                { label: "Discapacitado", value: paciente.discapacitado ? "Sí" : "No" },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                                    <span className="text-slate-500 font-medium shrink-0">{label}</span>
                                    <span className="text-slate-800 text-right font-semibold text-xs">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="stat-card stat-card-blue text-center p-4">
                            <p className="text-3xl font-bold text-slate-900">{totalEvaluaciones}</p>
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400 mt-1">Evaluaciones</p>
                        </div>
                        <div className="stat-card stat-card-emerald text-center p-4">
                            <p className="text-3xl font-bold text-emerald-700">{timeline?.length ?? 0}</p>
                            <p className="text-[0.65rem] font-bold uppercase text-slate-400 mt-1">Eventos</p>
                        </div>
                    </div>
                </div>

                {/* Evaluaciones e Historia */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Historial de evaluaciones */}
                    <div className="section-premium overflow-hidden">
                        <div className="section-header section-header-blue">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-bold text-blue-900">Historial de Evaluaciones</h3>
                                <p className="text-[0.65rem] text-blue-600">{totalEvaluaciones} evaluaciones registradas</p>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {!evaluaciones || evaluaciones.length === 0 ? (
                                <div className="p-10 text-center text-slate-400">
                                    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-50 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium">Sin evaluaciones registradas</p>
                                    <Link
                                        href={`/dashboard/evaluaciones/nueva?paciente_id=${id}`}
                                        className="inline-block mt-3 text-xs font-bold text-teal-600 hover:underline"
                                    >
                                        + Crear primera evaluación
                                    </Link>
                                </div>
                            ) : (
                                evaluaciones.map((ev: any) => {
                                    const cert = ev.certificado as any;
                                    const v = calcularVencimiento(ev.fecha_actual, ev.vigencia_meses);
                                    return (
                                        <div key={ev.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-center shrink-0">
                                                        <p className="text-xs font-bold text-slate-500">
                                                            {new Date(ev.fecha_actual).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                                                        </p>
                                                        <p className="text-[0.65rem] text-slate-400">
                                                            {new Date(ev.fecha_actual).getFullYear()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {ev.tipo_evaluacion}
                                                            {ev.enfasis ? ` — ${ev.enfasis}` : ""}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[0.65rem] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                                                {ev.modalidad || "Presencial"}
                                                            </span>
                                                            {v && !v.vencido && v.dias > 0 && (
                                                                <span className="text-[0.65rem] text-emerald-600 font-medium">
                                                                    Vigente ({v.dias} días)
                                                                </span>
                                                            )}
                                                            {v?.vencido && (
                                                                <span className="text-[0.65rem] text-red-500 font-medium">
                                                                    Vencido
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <ConceptoBadge concepto={cert?.concepto_medico} />
                                                    <Link
                                                        href={`/ver-examen/${ev.id}`}
                                                        target="_blank"
                                                        className="text-xs font-bold text-teal-600 hover:underline shrink-0"
                                                    >
                                                        Ver →
                                                    </Link>
                                                </div>
                                            </div>
                                            {cert?.restricciones && (
                                                <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-100">
                                                    ⚠️ {cert.restricciones}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    {timeline && timeline.length > 0 && (
                        <div className="section-premium overflow-hidden">
                            <div className="section-header section-header-emerald">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-sm font-bold text-emerald-900">Línea de Tiempo</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {timeline.map((ev: any) => (
                                    <div key={ev.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                                        <span className="text-xl shrink-0">{TIPO_EMOJI[ev.tipo_evento] ?? "📝"}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{ev.titulo}</p>
                                            {ev.descripcion && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ev.descripcion}</p>
                                            )}
                                        </div>
                                        <span className="text-[0.65rem] text-slate-400 shrink-0">
                                            {new Date(ev.fecha_evento).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 text-center border-t border-slate-100">
                                <Link
                                    href={`/dashboard/timeline?paciente_id=${id}`}
                                    className="text-xs font-semibold text-emerald-600 hover:underline"
                                >
                                    Ver timeline completo →
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Historial laboral */}
                    {contextos && contextos.length > 0 && (
                        <div className="section-premium">
                            <div className="section-header section-header-amber">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <h3 className="text-sm font-bold text-amber-900">Historial Laboral</h3>
                            </div>
                            <div className="section-body space-y-3">
                                {contextos.map((ctx: any, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-900">{ctx.empresa_nombre || "Empresa no registrada"}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {ctx.cargo || "Sin cargo"}
                                                {ctx.fecha_ingreso ? ` · Ingreso: ${new Date(ctx.fecha_ingreso + "T00:00:00").toLocaleDateString("es-CO")}` : ""}
                                            </p>
                                            {ctx.lugar_realizacion && (
                                                <p className="text-[0.65rem] text-slate-400 mt-0.5">{ctx.lugar_realizacion}</p>
                                            )}
                                        </div>
                                        {idx === 0 && (
                                            <span className="ml-auto text-[0.65rem] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 shrink-0">
                                                Actual
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
