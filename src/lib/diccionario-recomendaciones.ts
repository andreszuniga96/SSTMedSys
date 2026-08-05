// Catálogo predefinido de recomendaciones y restricciones medico-ocupacionales en Colombia

export interface OpcionDiccionario {
    id: string;
    categoria: "general" | "osteomuscular" | "visual" | "auditivo" | "cardiovascular" | "ergonomico" | "restriccion";
    titulo: string;
    texto: string;
}

export const DICCIONARIO_RECOMENDACIONES: OpcionDiccionario[] = [
    // ── RECOMENDACIONES GENERALES ──
    {
        id: "rec-gen-1",
        categoria: "general",
        titulo: "Pausas Activas",
        texto: "Realizar pausas activas durante la jornada laboral por 5 a 10 minutos cada 2 horas con énfasis en estiramiento muscular.",
    },
    {
        id: "rec-gen-2",
        categoria: "general",
        titulo: "Higiene Postural",
        texto: "Mantener higiene postural adecuada durante la ejecución de sus actividades de trabajo y vida diaria.",
    },
    {
        id: "rec-gen-3",
        categoria: "general",
        titulo: "Estilos de Vida Saludables",
        texto: "Fomentar estilos de vida y trabajo saludables: realizar actividad física regular al menos 150 minutos a la semana y mantener dieta balanceada.",
    },
    {
        id: "rec-gen-4",
        categoria: "general",
        titulo: "Uso Obligatorio de EPP",
        texto: "Uso permanente de Elementos de Protección Personal (EPP) según matriz de riesgos de la empresa.",
    },
    {
        id: "rec-gen-5",
        categoria: "general",
        titulo: "Control Médico Anual",
        texto: "Asistir a examen médico ocupacional periódico anualmente.",
    },

    // ── OSTEOMUSCULAR / ERGONÓMICO ──
    {
        id: "rec-ost-1",
        categoria: "osteomuscular",
        titulo: "Manejo Seguro de Cargas",
        texto: "Manejo manual de cargas según Resolución 2400/79: máximo 25 kg para hombres y 12.5 kg para mujeres, dobla rodillas y mantener carga cerca al cuerpo.",
    },
    {
        id: "rec-ost-2",
        categoria: "osteomuscular",
        titulo: "Reducción Posturas Prolongadas",
        texto: "Alternar la postura de trabajo entre de pie y sentado para evitar fatiga muscular focalizada.",
    },
    {
        id: "rec-ost-3",
        categoria: "osteomuscular",
        titulo: "GATISO Osteomuscular",
        texto: "Ingreso al Programa de Vigilancia Epidemiológica (PVE) para prevención de lesiones osteomusculares (DME).",
    },

    // ── VISUAL ──
    {
        id: "rec-vis-1",
        categoria: "visual",
        titulo: "Corrección Óptica Permanente",
        texto: "Uso permanente de lentes de corrección óptica formulados para actividades laborales y de lectura.",
    },
    {
        id: "rec-vis-2",
        categoria: "visual",
        titulo: "Descanso Visual (Regla 20-20-20)",
        texto: "Realizar pausas de descanso visual cada 20 minutos de trabajo frente a pantallas, mirando un punto distante por 20 segundos.",
    },
    {
        id: "rec-vis-3",
        categoria: "visual",
        titulo: "Control Optométrico Anual",
        texto: "Realizar valoración optométrica u oftalmológica de control anualmente por su EPS.",
    },

    // ── AUDITIVO ──
    {
        id: "rec-aud-1",
        categoria: "auditivo",
        titulo: "Protección Auditiva",
        texto: "Uso obligatorio de protector auditivo (de inserción o copa) en áreas con nivel de presión sonora continuo igual o superior a 85 dBA.",
    },
    {
        id: "rec-aud-2",
        categoria: "auditivo",
        titulo: "Audiometría de Control",
        texto: "Repetir examen audiométrico de control en 6 a 12 meses.",
    },

    // ── CARDIOVASCULAR / METABÓLICO ──
    {
        id: "rec-car-1",
        categoria: "cardiovascular",
        titulo: "Control HTA por EPS",
        texto: "Asistir a consulta de control cardiovascular por su EPS para monitoreo de cifras tensionales.",
    },
    {
        id: "rec-car-2",
        categoria: "cardiovascular",
        titulo: "Control Nutricional e IMC",
        texto: "Remisión a programa de nutrición por EPS para control de peso corporal y reducción de IMC.",
    },

    // ── RESTRICCIONES (RESTRICCIONES LABORALES) ──
    {
        id: "res-1",
        categoria: "restriccion",
        titulo: "Sin Restricciones",
        texto: "No presenta restricciones para el desempeño de las funciones de su cargo.",
    },
    {
        id: "res-2",
        categoria: "restriccion",
        titulo: "Restricción Levantamiento Cargas",
        texto: "Evitar el levantamiento manual de cargas superiores a 10 kg de forma repetitiva.",
    },
    {
        id: "res-3",
        categoria: "restriccion",
        titulo: "Restricción Posturas Forzadas",
        texto: "Evitar flexión extrema de tronco o giros bruscos de columna vertebral.",
    },
    {
        id: "res-4",
        categoria: "restriccion",
        titulo: "Restricción Trabajo en Alturas",
        texto: "No apto para trabajo en alturas mayor a 1.50 metros ni en espacios confinados sin valoración médica especializada adicional.",
    },
    {
        id: "res-5",
        categoria: "restriccion",
        titulo: "Restricción Movimientos Repetitivos",
        texto: "Restricción temporal de movimientos altamente repetitivos en miembros superiores por más de 4 horas continuas.",
    },
];
