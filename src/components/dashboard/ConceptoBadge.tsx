const conceptoClase: Record<string, string> = {
    "Apto": "badge-green",
    "No Apto": "badge-red",
    "Apto con Restricciones": "badge-amber",
    "Aplazado": "badge-blue",
};

interface ConceptoBadgeProps {
    concepto?: string | null;
    // Texto cuando no hay concepto emitido (por defecto "Pendiente")
    pendiente?: string;
    // Elevación sutil para tarjetas (en tablas se omite)
    sombra?: boolean;
}

// Badge estándar del concepto médico del certificado ocupacional.
export default function ConceptoBadge({ concepto, pendiente = "Pendiente", sombra = false }: ConceptoBadgeProps) {
    return (
        <span className={`badge ${sombra ? "shadow-sm " : ""}${conceptoClase[concepto || ""] || "badge-slate"}`}>
            {concepto || pendiente}
        </span>
    );
}
