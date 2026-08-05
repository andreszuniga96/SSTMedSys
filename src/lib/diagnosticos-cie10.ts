// Catálogo de diagnósticos CIE-10 frecuentes en Medicina Ocupacional
// Optimizado para búsqueda fuzzy en el frontend

export interface DiagnosticoCIE10 {
    codigo: string;
    nombre: string;
    categoria: string;
}

export const DIAGNOSTICOS_CIE10: DiagnosticoCIE10[] = [
    // ── OSTEOMUSCULARES ──
    { codigo: "M54.5", nombre: "Lumbago no especificado", categoria: "Osteomuscular" },
    { codigo: "M54.2", nombre: "Cervicalgia", categoria: "Osteomuscular" },
    { codigo: "M54.4", nombre: "Lumbago con ciática", categoria: "Osteomuscular" },
    { codigo: "M54.1", nombre: "Radiculopatía", categoria: "Osteomuscular" },
    { codigo: "M54.9", nombre: "Dorsalgia no especificada", categoria: "Osteomuscular" },
    { codigo: "M75.1", nombre: "Síndrome del manguito rotador", categoria: "Osteomuscular" },
    { codigo: "M75.0", nombre: "Capsulitis adhesiva del hombro", categoria: "Osteomuscular" },
    { codigo: "M65.4", nombre: "Tenosinovitis de estiloides radial (De Quervain)", categoria: "Osteomuscular" },
    { codigo: "M65.9", nombre: "Sinovitis y tenosinovitis no especificada", categoria: "Osteomuscular" },
    { codigo: "M77.1", nombre: "Epicondilitis lateral (codo de tenista)", categoria: "Osteomuscular" },
    { codigo: "M77.0", nombre: "Epicondilitis medial", categoria: "Osteomuscular" },
    { codigo: "G56.0", nombre: "Síndrome del túnel del carpo", categoria: "Osteomuscular" },
    { codigo: "M79.1", nombre: "Mialgia", categoria: "Osteomuscular" },
    { codigo: "M79.3", nombre: "Paniculitis no especificada", categoria: "Osteomuscular" },
    { codigo: "M67.4", nombre: "Ganglión (quiste sinovial)", categoria: "Osteomuscular" },
    { codigo: "M51.1", nombre: "Hernia del disco lumbar con radiculopatía", categoria: "Osteomuscular" },
    { codigo: "M51.2", nombre: "Otra degeneración especificada de disco intervertebral", categoria: "Osteomuscular" },
    { codigo: "M53.1", nombre: "Síndrome cervicobraquial", categoria: "Osteomuscular" },
    { codigo: "M62.8", nombre: "Otros trastornos especificados de los músculos", categoria: "Osteomuscular" },
    { codigo: "M25.5", nombre: "Dolor articular", categoria: "Osteomuscular" },
    { codigo: "M17.1", nombre: "Gonartrosis primaria bilateral", categoria: "Osteomuscular" },
    { codigo: "M17.9", nombre: "Gonartrosis no especificada", categoria: "Osteomuscular" },
    { codigo: "M19.9", nombre: "Artrosis no especificada", categoria: "Osteomuscular" },
    { codigo: "M70.6", nombre: "Bursitis del trocánter", categoria: "Osteomuscular" },
    { codigo: "M23.5", nombre: "Inestabilidad crónica de la rodilla", categoria: "Osteomuscular" },

    // ── CARDIOVASCULAR ──
    { codigo: "I10", nombre: "Hipertensión esencial (primaria)", categoria: "Cardiovascular" },
    { codigo: "I11.9", nombre: "Cardiopatía hipertensiva sin insuficiencia cardíaca", categoria: "Cardiovascular" },
    { codigo: "I25.1", nombre: "Enfermedad aterosclerótica del corazón", categoria: "Cardiovascular" },
    { codigo: "I20.9", nombre: "Angina de pecho no especificada", categoria: "Cardiovascular" },
    { codigo: "I48", nombre: "Fibrilación y aleteo auricular", categoria: "Cardiovascular" },
    { codigo: "I83.9", nombre: "Venas varicosas de miembros inferiores sin úlcera", categoria: "Cardiovascular" },
    { codigo: "I73.9", nombre: "Enfermedad vascular periférica no especificada", categoria: "Cardiovascular" },

    // ── RESPIRATORIO ──
    { codigo: "J30.4", nombre: "Rinitis alérgica no especificada", categoria: "Respiratorio" },
    { codigo: "J31.0", nombre: "Rinitis crónica", categoria: "Respiratorio" },
    { codigo: "J45.9", nombre: "Asma no especificada", categoria: "Respiratorio" },
    { codigo: "J45.0", nombre: "Asma predominantemente alérgica", categoria: "Respiratorio" },
    { codigo: "J44.9", nombre: "Enfermedad pulmonar obstructiva crónica (EPOC)", categoria: "Respiratorio" },
    { codigo: "J68.0", nombre: "Bronquitis y neumonitis por gases, humos y vapores", categoria: "Respiratorio" },
    { codigo: "J67.9", nombre: "Neumonitis por hipersensibilidad (polvos orgánicos)", categoria: "Respiratorio" },
    { codigo: "J06.9", nombre: "Infección aguda de las vías respiratorias superiores", categoria: "Respiratorio" },

    // ── VISUAL ──
    { codigo: "H52.1", nombre: "Miopía", categoria: "Visual" },
    { codigo: "H52.0", nombre: "Hipermetropía", categoria: "Visual" },
    { codigo: "H52.2", nombre: "Astigmatismo", categoria: "Visual" },
    { codigo: "H52.4", nombre: "Presbicia", categoria: "Visual" },
    { codigo: "H10.1", nombre: "Conjuntivitis aguda atópica", categoria: "Visual" },
    { codigo: "H53.9", nombre: "Perturbación visual no especificada", categoria: "Visual" },
    { codigo: "H40.1", nombre: "Glaucoma primario de ángulo abierto", categoria: "Visual" },
    { codigo: "H04.1", nombre: "Síndrome del ojo seco", categoria: "Visual" },
    { codigo: "H57.1", nombre: "Dolor ocular", categoria: "Visual" },

    // ── AUDITIVO ──
    { codigo: "H90.3", nombre: "Hipoacusia neurosensorial bilateral", categoria: "Auditivo" },
    { codigo: "H90.5", nombre: "Hipoacusia neurosensorial no especificada", categoria: "Auditivo" },
    { codigo: "H91.9", nombre: "Hipoacusia no especificada", categoria: "Auditivo" },
    { codigo: "H83.3", nombre: "Efectos del ruido sobre el oído interno", categoria: "Auditivo" },
    { codigo: "H93.1", nombre: "Tinnitus (acúfenos)", categoria: "Auditivo" },
    { codigo: "H81.0", nombre: "Enfermedad de Ménière", categoria: "Auditivo" },

    // ── MENTAL / PSICOSOCIAL ──
    { codigo: "F32.0", nombre: "Episodio depresivo leve", categoria: "Mental" },
    { codigo: "F32.1", nombre: "Episodio depresivo moderado", categoria: "Mental" },
    { codigo: "F32.9", nombre: "Episodio depresivo no especificado", categoria: "Mental" },
    { codigo: "F41.1", nombre: "Trastorno de ansiedad generalizada", categoria: "Mental" },
    { codigo: "F41.0", nombre: "Trastorno de pánico", categoria: "Mental" },
    { codigo: "F41.9", nombre: "Trastorno de ansiedad no especificado", categoria: "Mental" },
    { codigo: "F43.0", nombre: "Reacción al estrés agudo", categoria: "Mental" },
    { codigo: "F43.1", nombre: "Trastorno de estrés postraumático", categoria: "Mental" },
    { codigo: "F43.2", nombre: "Trastornos de adaptación", categoria: "Mental" },
    { codigo: "F48.0", nombre: "Neurastenia (síndrome de burnout)", categoria: "Mental" },
    { codigo: "F51.0", nombre: "Insomnio no orgánico", categoria: "Mental" },

    // ── DERMATOLÓGICO ──
    { codigo: "L23.9", nombre: "Dermatitis alérgica de contacto", categoria: "Dermatológico" },
    { codigo: "L24.9", nombre: "Dermatitis de contacto por irritantes", categoria: "Dermatológico" },
    { codigo: "L50.0", nombre: "Urticaria alérgica", categoria: "Dermatológico" },
    { codigo: "L30.9", nombre: "Dermatitis no especificada", categoria: "Dermatológico" },
    { codigo: "L70.0", nombre: "Acné vulgar", categoria: "Dermatológico" },

    // ── ENDOCRINO / METABÓLICO ──
    { codigo: "E11.9", nombre: "Diabetes mellitus tipo 2 sin complicaciones", categoria: "Endocrino" },
    { codigo: "E78.5", nombre: "Hiperlipidemia no especificada", categoria: "Endocrino" },
    { codigo: "E78.0", nombre: "Hipercolesterolemia pura", categoria: "Endocrino" },
    { codigo: "E66.9", nombre: "Obesidad no especificada", categoria: "Endocrino" },
    { codigo: "E66.0", nombre: "Obesidad debida a exceso de calorías", categoria: "Endocrino" },
    { codigo: "E03.9", nombre: "Hipotiroidismo no especificado", categoria: "Endocrino" },
    { codigo: "E05.9", nombre: "Tirotoxicosis no especificada", categoria: "Endocrino" },

    // ── DIGESTIVO ──
    { codigo: "K21.0", nombre: "Enfermedad por reflujo gastroesofágico con esofagitis", categoria: "Digestivo" },
    { codigo: "K29.7", nombre: "Gastritis no especificada", categoria: "Digestivo" },
    { codigo: "K59.0", nombre: "Estreñimiento", categoria: "Digestivo" },
    { codigo: "K58.9", nombre: "Síndrome del intestino irritable sin diarrea", categoria: "Digestivo" },

    // ── NEUROLÓGICO ──
    { codigo: "G43.9", nombre: "Migraña no especificada", categoria: "Neurológico" },
    { codigo: "G44.2", nombre: "Cefalea tensional", categoria: "Neurológico" },
    { codigo: "G47.3", nombre: "Apnea del sueño", categoria: "Neurológico" },
    { codigo: "G62.9", nombre: "Polineuropatía no especificada", categoria: "Neurológico" },

    // ── URINARIO ──
    { codigo: "N39.0", nombre: "Infección de vías urinarias", categoria: "Urinario" },
    { codigo: "N20.0", nombre: "Cálculo del riñón", categoria: "Urinario" },

    // ── ACCIDENTES LABORALES ──
    { codigo: "S62.5", nombre: "Fractura de pulgar", categoria: "Traumático" },
    { codigo: "S62.6", nombre: "Fractura de otro dedo de la mano", categoria: "Traumático" },
    { codigo: "S93.4", nombre: "Esguince del tobillo", categoria: "Traumático" },
    { codigo: "S83.5", nombre: "Esguince de rodilla", categoria: "Traumático" },
    { codigo: "T14.0", nombre: "Herida superficial de región no especificada", categoria: "Traumático" },
    { codigo: "T15.9", nombre: "Cuerpo extraño en parte externa del ojo", categoria: "Traumático" },
    { codigo: "W01", nombre: "Caída en el mismo nivel por tropezón", categoria: "Traumático" },

    // ── INTOXICACIONES OCUPACIONALES ──
    { codigo: "T56.0", nombre: "Efecto tóxico del plomo y sus compuestos", categoria: "Intoxicación" },
    { codigo: "T52.9", nombre: "Efectos tóxicos de disolventes orgánicos", categoria: "Intoxicación" },
    { codigo: "T59.9", nombre: "Efecto tóxico de gases, humos y vapores", categoria: "Intoxicación" },

    // ── EXAMEN SIN PATOLOGÍA ──
    { codigo: "Z00.0", nombre: "Examen médico general", categoria: "Examen" },
    { codigo: "Z02.1", nombre: "Examen preempleo", categoria: "Examen" },
    { codigo: "Z10.0", nombre: "Examen de salud ocupacional", categoria: "Examen" },
    { codigo: "Z57.9", nombre: "Exposición ocupacional a factor de riesgo no especificado", categoria: "Examen" },
    { codigo: "Z73.0", nombre: "Problemas relacionados con el agotamiento vital (burnout)", categoria: "Examen" },
];

// ── BÚSQUEDA FUZZY ──
const normalizar = (text: string): string =>
    text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // quitar tildes
        .replace(/[^a-z0-9\s.]/g, "");

export function buscarDiagnosticos(query: string, limite: number = 15): DiagnosticoCIE10[] {
    if (!query || query.trim().length < 2) return [];

    const queryNorm = normalizar(query);
    const terminos = queryNorm.split(/\s+/).filter(Boolean);

    const scored = DIAGNOSTICOS_CIE10.map((d) => {
        const codigoNorm = normalizar(d.codigo);
        const nombreNorm = normalizar(d.nombre);
        const categoriaNorm = normalizar(d.categoria);

        let score = 0;

        // Coincidencia exacta de código
        if (codigoNorm === queryNorm) score += 100;
        else if (codigoNorm.startsWith(queryNorm)) score += 80;

        // Coincidencia por términos en nombre
        for (const term of terminos) {
            if (nombreNorm.includes(term)) score += 30;
            if (codigoNorm.includes(term)) score += 25;
            if (categoriaNorm.includes(term)) score += 10;
        }

        // Bonus si todos los términos coinciden
        if (terminos.length > 1 && terminos.every(t => nombreNorm.includes(t) || codigoNorm.includes(t))) {
            score += 20;
        }

        return { diagnostico: d, score };
    })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limite);

    return scored.map((s) => s.diagnostico);
}
