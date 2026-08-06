import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import EvaluacionesTabs from "@/components/EvaluacionesTabs";

export default async function EvaluacionesPage() {
    const supabase = await createClient();

    // Fetch evaluations directly
    const { data: evaluaciones, error: evalError } = await supabase
        .from("evaluaciones")
        .select("*")
        .order("fecha_actual", { ascending: false });

    // Fetch all related certificates
    const { data: certificados } = await supabase.from("certificados_aptitud").select("*");
    const { data: pacientes } = await supabase.from("pacientes").select("*");
    const { data: contextos } = await supabase.from("contexto_laboral").select("*");
    const { data: osteomusculares } = await supabase.from("valoracion_osteomuscular").select("*");
    const { data: historias } = await supabase.from("historia_clinica").select("*");

    if (evalError) {
        console.error("Error cargando evaluaciones:", evalError);
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-premium p-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-teal-700 bg-teal-50 border border-teal-200 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Evaluaciones Médicas Ocupacionales
                        </h2>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            Gestión, impresión y envío de certificados de aptitud laboral (CMALAB)
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/evaluaciones/nueva" className="btn-primary">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Nueva Evaluación
                </Link>
            </div>

            {/* Dos secciones: Presenciales y Telemedicina */}
            <EvaluacionesTabs
                evaluaciones={evaluaciones || []}
                certificados={certificados || []}
                pacientes={pacientes || []}
                contextos={contextos || []}
                osteomusculares={osteomusculares || []}
                historias={historias || []}
            />
        </div>
    );
}
