import Link from "next/link";
import { fechaVencimientoDe } from "@/lib/vigencia";

export interface ExamenVigenciaAlerta {
    id?: string;
    // PostgREST puede tipar la relación paciente como objeto o como arreglo
    paciente?: unknown;
    diasVencido?: number;
    diasRestantes?: number;
    // Datos del examen para mostrar la fecha exacta de vencimiento
    fecha_actual?: string | null;
    vigencia_meses?: number | null;
}

interface PacienteAlerta {
    id?: string;
    nombre_completo?: string;
}

// Normaliza la relación paciente (objeto | arreglo | null) a un objeto simple
const pacienteDe = (p: unknown): PacienteAlerta | null | undefined =>
    Array.isArray(p) ? (p[0] as PacienteAlerta) : (p as PacienteAlerta);

interface AlertaVigenciaProps {
    vencidos: ExamenVigenciaAlerta[];
    porVencer: ExamenVigenciaAlerta[];
    /** Máximo de chips visibles por tarjeta (por defecto 8) */
    limiteMostrar?: number;
}

// Alertas de vigencia/renovación compartidas:
// - Dashboard: alcance global (todos los pacientes).
// - Detalle de empresa: alcance por empresa contratante.
// Cada chip es un trabajador con su enlace directo a "Nueva Evaluación".
export default function AlertaVigencia({ vencidos, porVencer, limiteMostrar = 8 }: AlertaVigenciaProps) {
    if (vencidos.length === 0 && porVencer.length === 0) return null;

    const chip = (ev: ExamenVigenciaAlerta, tipo: "vencido" | "porVencer") => {
        const p = pacienteDe(ev.paciente);
        const venceEn = fechaVencimientoDe(ev.fecha_actual, ev.vigencia_meses);
        return (
            <div
                key={ev.id}
                className={`px-3 py-2 bg-white rounded-xl border shadow-sm ${
                    tipo === "vencido" ? "border-red-200" : "border-amber-200"
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${tipo === "vencido" ? "text-red-700" : "text-slate-800"}`}>
                        {p?.nombre_completo || "Trabajador"}
                    </span>
                    <span className={`text-[0.65rem] ${tipo === "vencido" ? "text-red-500" : "text-amber-600"}`}>
                        {tipo === "vencido"
                            ? `vencido hace ${ev.diasVencido} días`
                            : ev.diasRestantes === 0
                                ? "vence HOY"
                                : `vence en ${ev.diasRestantes} días`}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.65rem] text-slate-400">Vence: {venceEn || "—"}</span>
                    <Link
                        href={`/dashboard/evaluaciones/nueva?paciente_id=${p?.id || ""}`}
                        className="text-[0.65rem] font-bold text-teal-700 hover:underline"
                    >
                        {tipo === "vencido" ? "Renovar →" : "Agendar renovación →"}
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {vencidos.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-red-800">Exámenes vencidos — requieren renovación</h3>
                            <p className="text-xs text-red-600">Pacientes cuyo examen ocupacional superó su vigencia</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {vencidos.slice(0, limiteMostrar).map((ev) => chip(ev, "vencido"))}
                        {vencidos.length > limiteMostrar && (
                            <span className="text-xs font-semibold text-red-600 self-center">+{vencidos.length - limiteMostrar} más</span>
                        )}
                    </div>
                </div>
            )}
            {porVencer.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-amber-800">Exámenes por vencer (próximos 60 días)</h3>
                            <p className="text-xs text-amber-600">Programe la renovación de estos exámenes ocupacionales</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {porVencer.slice(0, limiteMostrar).map((ev) => chip(ev, "porVencer"))}
                        {porVencer.length > limiteMostrar && (
                            <span className="text-xs font-semibold text-amber-600 self-center">+{porVencer.length - limiteMostrar} más</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
