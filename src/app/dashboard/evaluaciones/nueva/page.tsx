"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import type { SignaturePadRef } from "@/components/SignaturePad";
import type { DiagnosticoCIE10 } from "@/lib/diagnosticos-cie10";
import DiccionarioSelector from "@/components/DiccionarioSelector";

const SignaturePad = dynamic(() => import("@/components/SignaturePad"), {
    ssr: false,
    loading: () => <div className="h-40 w-full shimmer rounded-lg" />,
});

const DiagnosticoCIE10Input = dynamic(() => import("@/components/DiagnosticoCIE10Input"), { ssr: false });

export default function NuevaEvaluacion() {
    const router = useRouter();
    const supabase = createClient();
    const signatureRef = useRef<SignaturePadRef>(null);
    const firmaFileRef = useRef<HTMLInputElement>(null);

    const [pacientes, setPacientes] = useState<any[]>([]);
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [paso, setPaso] = useState(1);
    const [modoFirma, setModoFirma] = useState<"pad" | "upload">("pad");
    const [firmaUpload, setFirmaUpload] = useState<string | null>(null);
    const [firmaExistenteUrl, setFirmaExistenteUrl] = useState<string | null>(null);
    const [diagnosticosCIE10, setDiagnosticosCIE10] = useState<DiagnosticoCIE10[]>([]);
    const [busquedaPaciente, setBusquedaPaciente] = useState("");
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [autoEnviarCorreo, setAutoEnviarCorreo] = useState(false);

    const [formData, setFormData] = useState({
        paciente_id: "",
        tipo_evaluacion: "Pre ingreso",
        modalidad: "Presencial",
        enfasis: "",
        examen_nombre: "Examen medico ocupacional de preingreso",
        hora_realizacion: new Date().toTimeString().slice(0, 5),
        cargo: "",
        empresa_id: "",
        empresa_nombre: "",
        empresa_nit: "",
        fecha_ingreso: "",
        hora_ingreso: new Date().toTimeString().slice(0, 5),
        lugar_realizacion: "TUQUERRES - NARIÑO",
        entidad_realizadora: "",
        entidad_direccion: "",
        anamnesis: "",
        hallazgos_examen_fisico: "",
        // ── Antecedentes Personales ──
        ant_patologicos: "NO", ant_patologicos_cual: "",
        ant_quirurgicos: "NO", ant_quirurgicos_cual: "",
        ant_traumaticos: "NO", ant_traumaticos_cual: "",
        ant_farmacologicos: "NO", ant_farmacologicos_cual: "",
        ant_alergicos: "NO", ant_alergicos_cual: "",
        ant_hospitalarios: "NO", ant_hospitalarios_cual: "",
        // Ginecobstétricos
        gine_menarquia: "", gine_fum: "", gine_pnf: "",
        gine_g: "", gine_p: "", gine_c: "", gine_a: "", gine_v: "", gine_m: "",
        // ── Antecedentes Familiares ──
        fam_parentesco: "", fam_patologia: "",
        // ── Antecedentes Ocupacionales ──
        ocu_empresa: "",
        ocu_biologico: false, ocu_fisico: false, ocu_biomecanico: false,
        ocu_quimico: false, ocu_ergonomico: false, ocu_psicosocial: false,
        // ── Enfermedades / Accidentes Laborales ──
        lab_empresa: "", lab_arl: "", lab_diagnostico: "", lab_fecha: "",
        // ── Hábitos ──
        hab_cigarrillo: "NO", hab_cigarrillo_frec: "",
        hab_alcohol: "NO", hab_alcohol_frec: "",
        hab_psicoactivas: "NO", hab_psicoactivas_frec: "", hab_psicoactivas_cual: "",
        hab_actividad_fisica: "NO", hab_actividad_fisica_frec: "", hab_actividad_fisica_cual: "",
        // ── Revisión por Sistemas ──
        rev_organos_sentidos: "NO", rev_organos_sentidos_amp: "",
        rev_cardiovascular: "NO", rev_cardiovascular_amp: "",
        rev_respiratorio: "NO", rev_respiratorio_amp: "",
        rev_gastrointestinal: "NO", rev_gastrointestinal_amp: "",
        rev_osteomuscular: "NO", rev_osteomuscular_amp: "",
        rev_otro: "",
        // ── Antecedentes Inmunológicos ──
        vac_tetanos: "NO", vac_tetanos_dosis: "",
        vac_hepatitis_b: "NO", vac_hepatitis_b_dosis: "",
        vac_covid: "NO", vac_covid_desc: "",
        // ── Signos Vitales ──
        sv_fc: "", sv_fr: "", sv_ta: "", sv_sat_o2: "",
        sv_lateralidad: "DIESTRO",
        // ── Exploración Física ──
        exp_cabeza_cuello: "NORMAL", exp_cabeza_cuello_amp: "",
        exp_torax: "NORMAL", exp_torax_amp: "",
        exp_cardiorespiratorio: "NORMAL", exp_cardiorespiratorio_amp: "",
        exp_abdomen: "NORMAL", exp_abdomen_amp: "",
        exp_neurologico: "NORMAL", exp_neurologico_amp: "",
        exp_organos_sentidos: "NORMAL", exp_organos_sentidos_amp: "",
        // ── Anexo Énfasis Osteomuscular ──
        ost_osteomuscular: "NORMAL", ost_osteomuscular_amp: "",
        ost_marcha: "NORMAL", ost_marcha_amp: "",
        ost_mmss: "NORMAL", ost_mmss_amp: "",
        ost_mmii: "NORMAL", ost_mmii_amp: "",
        ost_columna: "NORMAL", ost_columna_amp: "",
        ost_fuerza: "NORMAL", ost_fuerza_amp: "",
        ost_flexibilidad: "NORMAL", ost_flexibilidad_amp: "",
        // ── Pruebas Vestibulares ──
        vest_babinsky: "NORMAL", vest_babinsky_amp: "",
        // ── Factores de Riesgo del Puesto (Paso 5) ──
        riesgo_fisico: {
            temperaturas_altas: false, temperaturas_bajas: false,
            radiacion_ionizante: false, radiacion_no_ionizante: false,
            ruido: false, vibracion: false, iluminacion: false,
            ventilacion: false, fluido_electrico: false, otros: false,
        },
        riesgo_mecanico: {
            atrap_maquinas: false, atrap_objetos: false, caida_objetos: false,
            caidas_mismo_nivel: false, caidas_diferente_nivel: false,
            contacto_electrico: false, proyeccion_particulas: false,
            proyeccion_fluidos: false, pinchazos: false, cortes: false,
            atropellamiento: false, colision_vehicular: false, otros: false,
        },
        riesgo_quimico: {
            solidos: false, polvos: false, liquidos: false, humos: false,
            vapores: false, aerosoles: false, nieblas: false, gaseosos: false, otros: false,
        },
        riesgo_biologico: {
            virus: false, hongos: false, parasitos: false, bacterias: false,
            vectores: false, animales_domesticos: false, otros: false,
        },
        riesgo_ergonomico: {
            manejo_cargas: false, movimiento_repetitivo: false,
            posturas_forzadas: false, carga_estatica: false, otros: false,
        },
        riesgo_psicosocial: {
            monotonia: false, sobrecarga: false, alta_responsabilidad: false,
            minuciosidad: false, autonomia_decisiones: false, supervision: false,
            conflicto_rol: false, falta_claridad: false, distribucion_trabajo: false,
            turnos_rotativos: false, otros: false,
        },
        // ── Campos anteriores ──
        riesgos_ocupacionales: {
            fisico: false, mecanico: false, quimico: false,
            biologico: false, ergonomico: false, psicosocial: false
        },
        concepto_medico: "",
        aptitudes_tareas: "No aplica",
        ingreso_pve_preventivo: "Ninguno",
        programa_promocion_prevencion: "No registra/No aplica",
        recomendaciones_generales: "",
        restricciones: "",
        clasificacion_gatiso: "",
        clasificacion_gatiso_tipo: "TLUD",
        clasificacion_gatiso_grupo: "No registra",
        remision_controles_eps: "Ninguno",
        controles_arl: false,
        observaciones_medicas: "",
        recomendaciones_laborales: "No",
        restricciones_laborales: "No",
        otros_examenes_realizados: "No Aplica",
        antecedentes_incidentes: "NIEGA",
        antecedentes_enfermedad: "NIEGA",
        antecedentes_secuelas: "NO APLICA",
        valoracion_osteomuscular: "",
        examenes_complementarios: "No aplica",
        firma_paciente_nombre: "",
        firma_paciente_cedula: "",
    });

    useEffect(() => {
        const fetchPacientes = async () => {
            const [resPacientes, resEmpresas] = await Promise.all([
                supabase.from("pacientes").select("*"),
                supabase.from("empresas").select("*").order("nombre"),
            ]);
            const data = resPacientes.data;
            if (data) {
                setPacientes(data);
                if (typeof window !== "undefined") {
                    const searchParams = new URLSearchParams(window.location.search);
                    const pId = searchParams.get("paciente_id");
                    if (pId && data.some((p) => p.id === pId)) {
                        setFormData((prev) => ({ ...prev, paciente_id: pId }));
                    }
                    const empId = searchParams.get("empresa_id");
                    if (empId && resEmpresas.data?.some((e) => e.id === empId)) {
                        const emp = resEmpresas.data.find((e) => e.id === empId);
                        setFormData((prev) => ({
                            ...prev,
                            empresa_id: empId,
                            empresa_nombre: emp?.nombre || prev.empresa_nombre,
                            empresa_nit: emp?.nit || prev.empresa_nit,
                        }));
                    }
                }
            }
            setEmpresas(resEmpresas.data || []);
        };
        fetchPacientes();
    }, [supabase]);

    useEffect(() => {
        if (formData.paciente_id) {
            const p = pacientes.find((p) => p.id === formData.paciente_id);
            if (p) {
                setPacienteSeleccionado(p);
                setFormData((prev) => ({
                    ...prev,
                    firma_paciente_nombre: p.nombre_completo,
                    firma_paciente_cedula: p.documento_identidad,
                    cargo: p.profesion || prev.cargo,
                }));
                // Si el paciente es virtual (telemedicina) y ya capturó su firma en el portal, precargarla.
                // Si no tiene firma, limpiar cualquier precarga anterior (evita firmar con la de otro paciente).
                setFirmaExistenteUrl(p.firma_url || null);
                setFirmaUpload(null);
                if (p.firma_url) {
                    setModoFirma("upload");
                }
            }
        } else {
            setPacienteSeleccionado(null);
            setFirmaExistenteUrl(null);
        }
    }, [formData.paciente_id, pacientes]);

    useEffect(() => {
        const nombres: Record<string, string> = {
            "Pre ingreso": "Examen medico ocupacional de preingreso",
            "Periódico": "Examen medico ocupacional periódico",
            "Egreso": "Examen medico ocupacional de egreso",
            "Post incapacidad": "Examen medico ocupacional post incapacidad",
        };
        setFormData((prev) => ({
            ...prev,
            examen_nombre: nombres[prev.tipo_evaluacion] || prev.examen_nombre,
        }));
    }, [formData.tipo_evaluacion]);

    const handleRiesgoChange = (riesgo: string) => {
        setFormData((prev) => ({
            ...prev,
            riesgos_ocupacionales: {
                ...prev.riesgos_ocupacionales,
                [riesgo]: !prev.riesgos_ocupacionales[riesgo as keyof typeof prev.riesgos_ocupacionales]
            }
        }));
    };

    const handleRiesgoDetalle = (categoria: string, item: string) => {
        setFormData((prev) => {
            const cat = prev[categoria as keyof typeof prev] as Record<string, boolean>;
            return {
                ...prev,
                [categoria]: { ...cat, [item]: !cat[item] },
            };
        });
    };

    const procesarYSubirFirma = async (base64Image: string, evaluacionId: string) => {
        // Si ya es una URL pública (firma capturada en el portal pre-atención), usarla directamente
        if (base64Image.startsWith("http")) {
            return base64Image;
        }
        const res = await fetch(base64Image);
        const blob = await res.blob();
        const rutaArchivo = `${evaluacionId}_firma_paciente.png`;
        const { data, error } = await supabase.storage.from("firmas_biometricas").upload(rutaArchivo, blob, { contentType: "image/png", upsert: true });
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from("firmas_biometricas").getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    };

    const handleFirmaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setFirmaUpload(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.paciente_id) return toast.error("Seleccione un paciente.");

        let signatureBase64: string | null = null;
        if (modoFirma === "pad") {
            signatureBase64 = signatureRef.current?.getSignature() || null;
        } else {
            signatureBase64 = firmaUpload || firmaExistenteUrl || null;
        }

        if (!signatureBase64 && formData.modalidad === "Presencial") {
            return toast.error("La firma del paciente es obligatoria. Puede dibujarla o subir una foto.");
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sesión no encontrada");

            // 1. Create Evaluation
            const { data: evaluacion, error: errorEval } = await supabase
                .from("evaluaciones")
                .insert({
                    paciente_id: formData.paciente_id,
                    medico_id: user.id,
                    tipo_evaluacion: formData.tipo_evaluacion,
                    modalidad: formData.modalidad,
                    enfasis: formData.enfasis,
                    examen_nombre: formData.examen_nombre,
                    hora_realizacion: formData.hora_realizacion,
                })
                .select()
                .single();

            if (errorEval) throw errorEval;

            // 2. Upload signature
            let firmaUrl = null;
            if (signatureBase64) {
                firmaUrl = await procesarYSubirFirma(signatureBase64, evaluacion.id);
            }

            // 3. Save contexto laboral
            const contextoPromise = supabase.from("contexto_laboral").insert({
                paciente_id: formData.paciente_id,
                empresa_id: formData.empresa_id || null,
                empresa_nombre: formData.empresa_nombre,
                empresa_nit: formData.empresa_nit,
                cargo: formData.cargo,
                fecha_ingreso: formData.fecha_ingreso || null,
                hora_ingreso: formData.hora_ingreso || null,
                lugar_realizacion: formData.lugar_realizacion,
                entidad_realizadora: formData.entidad_realizadora,
                entidad_direccion: formData.entidad_direccion,
            });

            // 4. Save Clinical History (serializing structured checklist data)
            const historiaClinicaEstructurada = {
                antecedentes_personales: {
                    patologicos: { valor: formData.ant_patologicos, cual: formData.ant_patologicos_cual },
                    quirurgicos: { valor: formData.ant_quirurgicos, cual: formData.ant_quirurgicos_cual },
                    traumaticos: { valor: formData.ant_traumaticos, cual: formData.ant_traumaticos_cual },
                    farmacologicos: { valor: formData.ant_farmacologicos, cual: formData.ant_farmacologicos_cual },
                    alergicos: { valor: formData.ant_alergicos, cual: formData.ant_alergicos_cual },
                    hospitalarios: { valor: formData.ant_hospitalarios, cual: formData.ant_hospitalarios_cual },
                    ginecobstetricos: {
                        menarquia: formData.gine_menarquia, fum: formData.gine_fum, pnf: formData.gine_pnf,
                        g: formData.gine_g, p: formData.gine_p, c: formData.gine_c,
                        a: formData.gine_a, v: formData.gine_v, m: formData.gine_m,
                    },
                },
                antecedentes_familiares: { parentesco: formData.fam_parentesco, patologia: formData.fam_patologia },
                antecedentes_ocupacionales: {
                    empresa: formData.ocu_empresa,
                    biologico: formData.ocu_biologico, fisico: formData.ocu_fisico,
                    biomecanico: formData.ocu_biomecanico, quimico: formData.ocu_quimico,
                    ergonomico: formData.ocu_ergonomico, psicosocial: formData.ocu_psicosocial,
                },
                accidentes_laborales: {
                    empresa: formData.lab_empresa, arl: formData.lab_arl,
                    diagnostico: formData.lab_diagnostico, fecha: formData.lab_fecha,
                },
                habitos: {
                    cigarrillo: { valor: formData.hab_cigarrillo, frecuencia: formData.hab_cigarrillo_frec },
                    alcohol: { valor: formData.hab_alcohol, frecuencia: formData.hab_alcohol_frec },
                    psicoactivas: { valor: formData.hab_psicoactivas, frecuencia: formData.hab_psicoactivas_frec, cual: formData.hab_psicoactivas_cual },
                    actividad_fisica: { valor: formData.hab_actividad_fisica, frecuencia: formData.hab_actividad_fisica_frec, cual: formData.hab_actividad_fisica_cual },
                },
                revision_sistemas: {
                    organos_sentidos: { valor: formData.rev_organos_sentidos, ampliacion: formData.rev_organos_sentidos_amp },
                    cardiovascular: { valor: formData.rev_cardiovascular, ampliacion: formData.rev_cardiovascular_amp },
                    respiratorio: { valor: formData.rev_respiratorio, ampliacion: formData.rev_respiratorio_amp },
                    gastrointestinal: { valor: formData.rev_gastrointestinal, ampliacion: formData.rev_gastrointestinal_amp },
                    osteomuscular: { valor: formData.rev_osteomuscular, ampliacion: formData.rev_osteomuscular_amp },
                    otro: formData.rev_otro,
                },
                inmunologicos: {
                    tetanos: { valor: formData.vac_tetanos, dosis: formData.vac_tetanos_dosis },
                    hepatitis_b: { valor: formData.vac_hepatitis_b, dosis: formData.vac_hepatitis_b_dosis },
                    covid: { valor: formData.vac_covid, descripcion: formData.vac_covid_desc },
                },
                signos_vitales: {
                    fc: formData.sv_fc, fr: formData.sv_fr, ta: formData.sv_ta,
                    sat_o2: formData.sv_sat_o2, lateralidad: formData.sv_lateralidad,
                },
                exploracion: {
                    cabeza_cuello: { valor: formData.exp_cabeza_cuello, ampliacion: formData.exp_cabeza_cuello_amp },
                    torax: { valor: formData.exp_torax, ampliacion: formData.exp_torax_amp },
                    cardiorespiratorio: { valor: formData.exp_cardiorespiratorio, ampliacion: formData.exp_cardiorespiratorio_amp },
                    abdomen: { valor: formData.exp_abdomen, ampliacion: formData.exp_abdomen_amp },
                    neurologico: { valor: formData.exp_neurologico, ampliacion: formData.exp_neurologico_amp },
                    organos_sentidos: { valor: formData.exp_organos_sentidos, ampliacion: formData.exp_organos_sentidos_amp },
                },
                osteomuscular_anexo: {
                    osteomuscular: { valor: formData.ost_osteomuscular, ampliacion: formData.ost_osteomuscular_amp },
                    marcha: { valor: formData.ost_marcha, ampliacion: formData.ost_marcha_amp },
                    mmss: { valor: formData.ost_mmss, ampliacion: formData.ost_mmss_amp },
                    mmii: { valor: formData.ost_mmii, ampliacion: formData.ost_mmii_amp },
                    columna: { valor: formData.ost_columna, ampliacion: formData.ost_columna_amp },
                    fuerza: { valor: formData.ost_fuerza, ampliacion: formData.ost_fuerza_amp },
                    flexibilidad: { valor: formData.ost_flexibilidad, ampliacion: formData.ost_flexibilidad_amp },
                },
                vestibular: {
                    babinsky: { valor: formData.vest_babinsky, ampliacion: formData.vest_babinsky_amp },
                },
            };

            const factoresRiesgo = {
                fisico: formData.riesgo_fisico,
                mecanico: formData.riesgo_mecanico,
                quimico: formData.riesgo_quimico,
                biologico: formData.riesgo_biologico,
                ergonomico: formData.riesgo_ergonomico,
                psicosocial: formData.riesgo_psicosocial,
            };

            const historiaPromise = supabase.from("historia_clinica").insert({
                evaluacion_id: evaluacion.id,
                anamnesis: JSON.stringify(historiaClinicaEstructurada),
                hallazgos_examen_fisico: formData.hallazgos_examen_fisico || "",
                riesgos_ocupacionales: factoresRiesgo,
            });

            // 5. Save Certificate
            const certificadoPromise = supabase.from("certificados_aptitud").insert({
                evaluacion_id: evaluacion.id,
                concepto_medico: formData.concepto_medico,
                restricciones: formData.restricciones,
                recomendaciones_generales: formData.recomendaciones_generales,
                firma_paciente_url: firmaUrl,
                firma_paciente_nombre: formData.firma_paciente_nombre,
                firma_paciente_cedula: formData.firma_paciente_cedula,
                aptitudes_tareas: formData.aptitudes_tareas,
                ingreso_pve_preventivo: formData.ingreso_pve_preventivo,
                programa_promocion_prevencion: formData.programa_promocion_prevencion,
                clasificacion_gatiso: formData.clasificacion_gatiso,
                clasificacion_gatiso_tipo: formData.clasificacion_gatiso_tipo,
                clasificacion_gatiso_grupo: formData.clasificacion_gatiso_grupo,
                remision_controles_eps: formData.remision_controles_eps,
                controles_arl: formData.controles_arl,
                observaciones_medicas: formData.observaciones_medicas,
                recomendaciones_laborales: formData.recomendaciones_laborales,
                restricciones_laborales: formData.restricciones_laborales,
                otros_examenes_realizados: formData.otros_examenes_realizados,
                antecedentes_laborales: {
                    incidentes: formData.antecedentes_incidentes,
                    enfermedad_profesional: formData.antecedentes_enfermedad,
                    secuelas: formData.antecedentes_secuelas,
                },
                diagnosticos_cie10: diagnosticosCIE10.map((d) => ({ codigo: d.codigo, nombre: d.nombre })),
            });

            // 6. Save Osteomuscular
            const osteoPromise = formData.valoracion_osteomuscular
                ? supabase.from("valoracion_osteomuscular").insert({
                    evaluacion_id: evaluacion.id,
                    hallazgos: formData.valoracion_osteomuscular,
                })
                : Promise.resolve({ error: null });

            // 7. Auto-generate Timeline event
            const timelinePromise = supabase.from("timeline_eventos").insert({
                paciente_id: formData.paciente_id,
                tipo_evento: "evaluacion_medica",
                titulo: `${formData.tipo_evaluacion} — ${formData.concepto_medico}`,
                descripcion: `Evaluación médica ocupacional. Concepto: ${formData.concepto_medico}. Énfasis: ${formData.enfasis || 'General'}.`,
                fecha_evento: new Date().toISOString().split("T")[0],
                evaluacion_id: evaluacion.id,
                created_by: user.id,
                metadata: {
                    tipo_evaluacion: formData.tipo_evaluacion,
                    concepto: formData.concepto_medico,
                    enfasis: formData.enfasis,
                    empresa: formData.empresa_nombre,
                },
            });

            const results = await Promise.all([contextoPromise, historiaPromise, certificadoPromise, osteoPromise, timelinePromise]);

            for (const res of results) {
                if (res && res.error) throw res.error;
            }

            // 8. Envío automático del certificado por correo (si está activado y hay correo)
            const pacienteCorreo = pacienteSeleccionado?.correo_electronico;
            if (autoEnviarCorreo) {
                if (pacienteCorreo) {
                    toast.loading("Enviando certificado al paciente...", { id: "enviando-cert" });
                    try {
                        const res = await fetch("/api/enviar-certificado", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ evaluacion_id: evaluacion.id }),
                        });
                        let data: { error?: string; message?: string } = {};
                        try {
                            data = await res.json();
                        } catch {
                            data = { error: "Error del servidor (HTTP " + res.status + "). Intente de nuevo." };
                        }
                        toast.dismiss("enviando-cert");
                        if (res.ok) {
                            toast.success(data?.message || "✅ Certificado enviado por correo.");
                        } else if (/RESEND_API_KEY/i.test(data?.error || "")) {
                            toast.error("⚠️ El envío de correos no está configurado: agregue RESEND_API_KEY en .env.local (o en Vercel) y reinicie.");
                        } else {
                            toast.error(data?.error || "No se pudo enviar el certificado.");
                        }
                    } catch (sendErr: any) {
                        toast.dismiss("enviando-cert");
                        toast.error(`No se pudo enviar el certificado: ${sendErr?.message || "error"}`);
                    }
                } else {
                    toast.error("El paciente no tiene correo registrado; no se envió el certificado automáticamente.");
                }
            }

            toast.success("✅ Evaluación registrada exitosamente. Certificado listo para descargar.");
            router.push("/dashboard/evaluaciones");
            router.refresh();
        } catch (error: any) {
            console.error("Error al guardar evaluación:", error);
            toast.error(`Error al guardar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const pasos = [
        { num: 1, label: "Paciente y Parámetros" },
        { num: 2, label: "Orden Médica y Empresa" },
        { num: 3, label: "Valoración Médica" },
        { num: 4, label: "Historia Clínica" },
        { num: 5, label: "Osteomuscular y Complementarios" },
        { num: 6, label: "Diagnóstico y Firma" },
    ];

    const pacientesFiltrados = busquedaPaciente.length >= 2
        ? pacientes.filter((p) =>
            p.nombre_completo.toLowerCase().includes(busquedaPaciente.toLowerCase()) ||
            p.documento_identidad.includes(busquedaPaciente)
        )
        : pacientes;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        Nueva Evaluación Médica Ocupacional
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Diligenciamiento guiado con diccionario experto e inteligencia médica
                    </p>
                </div>
                <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">
                    ← Volver
                </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {pasos.map((p) => (
                    <button
                        key={p.num}
                        type="button"
                        onClick={() => setPaso(p.num)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                            paso === p.num
                                ? "text-white bg-blue-600 shadow-md"
                                : paso > p.num
                                    ? "text-green-700 bg-green-50 border border-green-200"
                                    : "border bg-white text-slate-500"
                        }`}
                    >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] font-bold ${
                            paso > p.num ? "bg-green-500 text-white" : paso === p.num ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                            {paso > p.num ? "✓" : p.num}
                        </span>
                        <span className="hidden md:inline">{p.label}</span>
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PASO 1 */}
                {paso === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="section-premium">
                            <div className="section-header section-header-blue">
                                <span className="text-lg">👤</span>
                                <h3 className="text-sm font-bold text-blue-900">Seleccionar Paciente</h3>
                            </div>
                            <div className="section-body space-y-4">
                                <input
                                    type="text"
                                    className="input-premium"
                                    placeholder="Buscar por documento o nombre..."
                                    value={busquedaPaciente}
                                    onChange={(e) => setBusquedaPaciente(e.target.value)}
                                />
                                <select
                                    required
                                    className="select-premium"
                                    value={formData.paciente_id}
                                    onChange={(e) => setFormData({ ...formData, paciente_id: e.target.value })}
                                >
                                    <option value="">— Seleccione un paciente —</option>
                                    {pacientesFiltrados.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.documento_identidad} — {p.nombre_completo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="section-premium">
                            <div className="section-header section-header-blue">
                                <span className="text-lg">⚙️</span>
                                <h3 className="text-sm font-bold text-blue-900">Parámetros del Examen</h3>
                            </div>
                            <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="label-premium">Tipo de Examen</label>
                                    <select className="select-premium" value={formData.tipo_evaluacion} onChange={(e) => setFormData({ ...formData, tipo_evaluacion: e.target.value })}>
                                        <option value="Pre ingreso">Pre ingreso</option>
                                        <option value="Periódico">Periódico</option>
                                        <option value="Egreso">Egreso</option>
                                        <option value="Post incapacidad">Post incapacidad</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Modalidad</label>
                                    <select className="select-premium" value={formData.modalidad} onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}>
                                        <option value="Presencial">Presencial</option>
                                        <option value="Virtual">Virtual (Telemedicina)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Énfasis</label>
                                    <select className="select-premium" value={formData.enfasis} onChange={(e) => setFormData({ ...formData, enfasis: e.target.value })}>
                                        <option value="">Seleccionar...</option>
                                        <option value="Osteomuscular">Osteomuscular</option>
                                        <option value="Trabajo en Alturas">Trabajo en Alturas</option>
                                        <option value="Cardiovascular">Cardiovascular</option>
                                        <option value="Auditivo">Auditivo</option>
                                        <option value="Visual">Visual</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 2 */}
                {paso === 2 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-amber">
                            <span className="text-lg">🏢</span>
                            <h3 className="text-sm font-bold text-amber-900">Datos de Empresa</h3>
                        </div>
                        <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="md:col-span-2">
                                <label className="label-premium">Empresa Contratante</label>
                                {empresas.length > 0 && (
                                    <select
                                        className="select-premium mb-2"
                                        value={formData.empresa_id}
                                        onChange={(e) => {
                                            const emp = empresas.find((x) => x.id === e.target.value);
                                            // Si eligen una empresa registrada, rellenar; si limpian, solo soltar el vínculo
                                            setFormData((prev) => ({
                                                ...prev,
                                                empresa_id: e.target.value,
                                                empresa_nombre: emp ? emp.nombre : prev.empresa_nombre,
                                                empresa_nit: emp ? emp.nit || prev.empresa_nit : prev.empresa_nit,
                                            }));
                                        }}
                                    >
                                        <option value="">— Empresa registrada (opcional) —</option>
                                        {empresas.map((e) => (
                                            <option key={e.id} value={e.id}>{e.nombre} {e.nit ? `· NIT ${e.nit}` : ""}</option>
                                        ))}
                                    </select>
                                )}
                                <input type="text" className="input-premium" placeholder="Ej. AMPM24 SAS" value={formData.empresa_nombre} onChange={(e) => setFormData({ ...formData, empresa_nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">NIT</label>
                                <input type="text" className="input-premium" placeholder="Ej. 900813532" value={formData.empresa_nit} onChange={(e) => setFormData({ ...formData, empresa_nit: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Cargo</label>
                                <input type="text" className="input-premium" placeholder="Ej. Docente" value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Fecha de Ingreso</label>
                                <input type="date" className="input-premium" value={formData.fecha_ingreso} onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Hora de Ingreso</label>
                                <input type="time" className="input-premium" value={formData.hora_ingreso} onChange={(e) => setFormData({ ...formData, hora_ingreso: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Lugar de Realización</label>
                                <input type="text" className="input-premium" placeholder="Ej. TUQUERRES - NARIÑO" value={formData.lugar_realizacion} onChange={(e) => setFormData({ ...formData, lugar_realizacion: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Entidad Realizadora</label>
                                <input type="text" className="input-premium" placeholder="Ej. IPS CMALAB" value={formData.entidad_realizadora} onChange={(e) => setFormData({ ...formData, entidad_realizadora: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 3: Valoración Médica (CON DICCIONARIO EXPERTO) */}
                {paso === 3 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-blue">
                            <span className="text-lg">📊</span>
                            <h3 className="text-sm font-bold text-blue-900">Valoración Médica (Certificado CMALAB)</h3>
                        </div>
                        <div className="section-body space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="label-premium">Concepto Médico *</label>
                                    <select required className="select-premium font-bold text-blue-900" value={formData.concepto_medico} onChange={(e) => setFormData({ ...formData, concepto_medico: e.target.value })}>
                                        <option value="" disabled>Seleccione una opción...</option>
                                        <option value="Apto">✅ Cumple para el cargo / Sin restricciones</option>
                                        <option value="Apto con Restricciones">⚠️ Cumple con restricciones para el cargo</option>
                                        <option value="No Apto">❌ No cumple para el cargo</option>
                                        <option value="Aplazado">⏳ Aplazado — Requiere valoración adicional</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Aptitudes y Tareas</label>
                                    <input list="aptitudes_opts" className="input-premium" placeholder="Ej. Trabajo en alturas..." value={formData.aptitudes_tareas} onChange={(e) => setFormData({ ...formData, aptitudes_tareas: e.target.value })} />
                                    <datalist id="aptitudes_opts">
                                        <option value="No aplica" />
                                        <option value="Apto para trabajo en alturas" />
                                        <option value="Apto para espacios confinados" />
                                        <option value="Apto para manipulación de alimentos" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="label-premium">Ingreso PVE Preventivo</label>
                                    <input list="pve_opts" className="input-premium" value={formData.ingreso_pve_preventivo} onChange={(e) => setFormData({ ...formData, ingreso_pve_preventivo: e.target.value })} />
                                    <datalist id="pve_opts">
                                        <option value="Ninguno" />
                                        <option value="Riesgo Biomecánico" />
                                        <option value="Riesgo Psicosocial" />
                                        <option value="Riesgo Cardiovascular" />
                                        <option value="Riesgo Químico" />
                                        <option value="Riesgo Físico" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="label-premium">Programa Promoción y Prevención</label>
                                    <input list="promocion_opts" className="input-premium" value={formData.programa_promocion_prevencion} onChange={(e) => setFormData({ ...formData, programa_promocion_prevencion: e.target.value })} />
                                    <datalist id="promocion_opts">
                                        <option value="No registra/No aplica" />
                                        <option value="Estilos de vida saludable" />
                                        <option value="Prevención de adicciones" />
                                        <option value="Conservación auditiva" />
                                        <option value="Conservación visual" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="label-premium">Clasificación GATISO</label>
                                    <select className="select-premium" value={formData.clasificacion_gatiso} onChange={(e) => setFormData({ ...formData, clasificacion_gatiso: e.target.value })}>
                                        <option value="" disabled>Seleccione una opción...</option>
                                        <option value="Osteomuscular">Osteomuscular</option>
                                        <option value="Cardiovascular">Cardiovascular</option>
                                        <option value="Auditivo">Auditivo</option>
                                        <option value="Visual">Visual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Remisión a Controles EPS</label>
                                    <input list="remision_opts" className="input-premium" value={formData.remision_controles_eps} onChange={(e) => setFormData({ ...formData, remision_controles_eps: e.target.value })} />
                                    <datalist id="remision_opts">
                                        <option value="Ninguno" />
                                        <option value="Medicina General" />
                                        <option value="Optometría" />
                                        <option value="Fisioterapia" />
                                        <option value="Psicología" />
                                        <option value="Nutrición" />
                                    </datalist>
                                </div>
                                <div>
                                    <label className="label-premium flex items-center gap-2 mt-8">
                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.controles_arl} onChange={(e) => setFormData({ ...formData, controles_arl: e.target.checked })} />
                                        Requiere Controles ARL
                                    </label>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label-premium">Observaciones Médicas</label>
                                    <textarea rows={2} className="input-premium" placeholder="Escriba aquí..." value={formData.observaciones_medicas} onChange={(e) => setFormData({ ...formData, observaciones_medicas: e.target.value })} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label-premium">Otros Exámenes Realizados (Complementarios)</label>
                                    <textarea rows={2} className="input-premium" placeholder="Escriba aquí..." value={formData.otros_examenes_realizados} onChange={(e) => setFormData({ ...formData, otros_examenes_realizados: e.target.value })} />
                                </div>
                            </div>

                            {/* RECOMENDACIONES CON DICCIONARIO */}
                            <div>
                                <label className="label-premium flex justify-between items-center">
                                    <span>Recomendaciones y Medidas Preventivas</span>
                                </label>
                                <DiccionarioSelector
                                    tipo="recomendacion"
                                    valorActual={formData.recomendaciones_generales}
                                    onInsertar={(texto) => setFormData({ ...formData, recomendaciones_generales: texto })}
                                />
                                <textarea
                                    rows={3}
                                    className="input-premium"
                                    placeholder="Seleccione de arriba o escriba recomendaciones personalizadas..."
                                    value={formData.recomendaciones_generales}
                                    onChange={(e) => setFormData({ ...formData, recomendaciones_generales: e.target.value })}
                                />
                            </div>

                            {/* RESTRICCIONES CON DICCIONARIO */}
                            <div>
                                <label className="label-premium flex justify-between items-center">
                                    <span>Restricciones Laborales</span>
                                </label>
                                <DiccionarioSelector
                                    tipo="restriccion"
                                    valorActual={formData.restricciones}
                                    onInsertar={(texto) => setFormData({ ...formData, restricciones: texto })}
                                />
                                <textarea
                                    rows={2}
                                    className="input-premium"
                                    placeholder="Seleccione de arriba o escriba restricciones especificadas..."
                                    value={formData.restricciones}
                                    onChange={(e) => setFormData({ ...formData, restricciones: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 4 – Historia Clínica Ocupacional (Checklist estructurado) */}
                {paso === 4 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-red">
                            <span className="text-lg">🔒</span>
                            <h3 className="text-sm font-bold text-red-900">Historia Clínica Ocupacional (Privada)</h3>
                        </div>
                        <div className="section-body space-y-6">

                            {/* ── ANTECEDENTES PERSONALES ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Antecedentes Personales</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-red-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-40">Antecedente</th>
                                                <th className="px-3 py-2 font-bold text-slate-700 w-20 text-center">SI</th>
                                                <th className="px-3 py-2 font-bold text-slate-700 w-20 text-center">NO</th>
                                                <th className="px-3 py-2 font-bold text-slate-700 text-left">¿Cuál? / Observación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {([
                                                ["ant_patologicos", "PATOLÓGICOS"],
                                                ["ant_quirurgicos", "QUIRÚRGICOS"],
                                                ["ant_traumaticos", "TRAUMÁTICOS"],
                                                ["ant_farmacologicos", "FARMACOLÓGICOS"],
                                                ["ant_alergicos", "ALÉRGICOS"],
                                                ["ant_hospitalarios", "HOSPITALARIOS"],
                                            ] as [string, string][]).map(([key, label], i) => (
                                                <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{label}:</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <input type="radio" name={key} value="SI"
                                                            checked={formData[key as keyof typeof formData] === "SI"}
                                                            onChange={() => setFormData({ ...formData, [key]: "SI" })}
                                                            className="w-4 h-4 text-red-600" />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <input type="radio" name={key} value="NO"
                                                            checked={formData[key as keyof typeof formData] === "NO"}
                                                            onChange={() => setFormData({ ...formData, [key]: "NO" })}
                                                            className="w-4 h-4 text-red-600" />
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <input type="text" placeholder="Especificar..."
                                                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-red-400 outline-none"
                                                            value={formData[`${key}_cual` as keyof typeof formData] as string}
                                                            onChange={(e) => setFormData({ ...formData, [`${key}_cual`]: e.target.value })} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Ginecobstétricos */}
                                <div className="mt-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                                    <p className="text-xs font-bold text-pink-800 mb-2">GINECOBSTÉTRICOS (si aplica):</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div><label className="text-[0.65rem] text-slate-500">Menarquía</label><input type="text" className="input-premium text-xs py-1" placeholder="Ej. 13" value={formData.gine_menarquia} onChange={(e) => setFormData({ ...formData, gine_menarquia: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">FUM</label><input type="date" className="input-premium text-xs py-1" value={formData.gine_fum} onChange={(e) => setFormData({ ...formData, gine_fum: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">PNF</label><input type="text" className="input-premium text-xs py-1" placeholder="NO REFIERE" value={formData.gine_pnf} onChange={(e) => setFormData({ ...formData, gine_pnf: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">G</label><input type="text" className="input-premium text-xs py-1" placeholder="" value={formData.gine_g} onChange={(e) => setFormData({ ...formData, gine_g: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">P</label><input type="text" className="input-premium text-xs py-1" placeholder="" value={formData.gine_p} onChange={(e) => setFormData({ ...formData, gine_p: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">C</label><input type="text" className="input-premium text-xs py-1" placeholder="" value={formData.gine_c} onChange={(e) => setFormData({ ...formData, gine_c: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">A</label><input type="text" className="input-premium text-xs py-1" placeholder="" value={formData.gine_a} onChange={(e) => setFormData({ ...formData, gine_a: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">V</label><input type="text" className="input-premium text-xs py-1" placeholder="" value={formData.gine_v} onChange={(e) => setFormData({ ...formData, gine_v: e.target.value })} /></div>
                                        <div><label className="text-[0.65rem] text-slate-500">M</label><input type="text" className="input-premium text-xs py-1" placeholder="" value={formData.gine_m} onChange={(e) => setFormData({ ...formData, gine_m: e.target.value })} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* ── ANTECEDENTES FAMILIARES ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Antecedentes Familiares</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div><label className="label-premium text-xs">Parentesco</label><input type="text" className="input-premium text-xs" placeholder="Ej. Padre, Madre..." value={formData.fam_parentesco} onChange={(e) => setFormData({ ...formData, fam_parentesco: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Patología</label><input type="text" className="input-premium text-xs" placeholder="Ej. HTA, DM2..." value={formData.fam_patologia} onChange={(e) => setFormData({ ...formData, fam_patologia: e.target.value })} /></div>
                                </div>
                            </div>

                            {/* ── ANTECEDENTES OCUPACIONALES ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Antecedentes Ocupacionales</h4>
                                <div className="space-y-2">
                                    <div><label className="label-premium text-xs">Empresa</label><input type="text" className="input-premium text-xs" placeholder="Nombre de la empresa anterior..." value={formData.ocu_empresa} onChange={(e) => setFormData({ ...formData, ocu_empresa: e.target.value })} /></div>
                                    <p className="text-xs font-semibold text-slate-600 mt-2">Exposición a riesgos:</p>
                                    <div className="flex flex-wrap gap-3">
                                        {[{k:"ocu_biologico",l:"Biológico"},{k:"ocu_fisico",l:"Físico"},{k:"ocu_biomecanico",l:"Biomecánico"},{k:"ocu_quimico",l:"Químico"},{k:"ocu_ergonomico",l:"Ergonómico"},{k:"ocu_psicosocial",l:"Psicosocial"}].map(({k,l}) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-red-600 rounded"
                                                    checked={formData[k as keyof typeof formData] as boolean}
                                                    onChange={() => setFormData({...formData, [k]: !formData[k as keyof typeof formData]})} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── ENFERMEDADES / ACCIDENTES LABORALES ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Enfermedades Laborales o Accidentes Laborales</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div><label className="label-premium text-xs">Empresa</label><input type="text" className="input-premium text-xs" placeholder="" value={formData.lab_empresa} onChange={(e) => setFormData({ ...formData, lab_empresa: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">ARL</label><input type="text" className="input-premium text-xs" placeholder="" value={formData.lab_arl} onChange={(e) => setFormData({ ...formData, lab_arl: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Diagnóstico</label><input type="text" className="input-premium text-xs" placeholder="" value={formData.lab_diagnostico} onChange={(e) => setFormData({ ...formData, lab_diagnostico: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Fecha Ocurrencia</label><input type="date" className="input-premium text-xs" value={formData.lab_fecha} onChange={(e) => setFormData({ ...formData, lab_fecha: e.target.value })} /></div>
                                </div>
                            </div>

                            {/* ── HÁBITOS ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Hábitos</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-amber-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-44">Hábito</th>
                                                <th className="px-2 py-2 text-center w-12">SI</th>
                                                <th className="px-2 py-2 text-center w-12">NO</th>
                                                <th className="px-2 py-2 text-left">Frecuencia</th>
                                                <th className="px-2 py-2 text-left">¿Cuáles?</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {([
                                                { vKey: "hab_cigarrillo", fKey: "hab_cigarrillo_frec", cKey: null, label: "CONSUMO DE CIGARRILLO" },
                                                { vKey: "hab_alcohol", fKey: "hab_alcohol_frec", cKey: null, label: "CONSUMO DE ALCOHOL" },
                                                { vKey: "hab_psicoactivas", fKey: "hab_psicoactivas_frec", cKey: "hab_psicoactivas_cual", label: "SUSTANCIAS PSICOACTIVAS" },
                                                { vKey: "hab_actividad_fisica", fKey: "hab_actividad_fisica_frec", cKey: "hab_actividad_fisica_cual", label: "ACTIVIDAD FÍSICA" },
                                            ]).map(({ vKey, fKey, cKey, label }, i) => (
                                                <tr key={vKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{label}:</td>
                                                    <td className="px-2 py-2 text-center">
                                                        <input type="radio" name={vKey} value="SI" checked={formData[vKey as keyof typeof formData] === "SI"} onChange={() => setFormData({ ...formData, [vKey]: "SI" })} className="w-4 h-4 text-amber-600" />
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <input type="radio" name={vKey} value="NO" checked={formData[vKey as keyof typeof formData] === "NO"} onChange={() => setFormData({ ...formData, [vKey]: "NO" })} className="w-4 h-4 text-amber-600" />
                                                    </td>
                                                    <td className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-amber-400 outline-none" placeholder="Frecuencia..." value={formData[fKey as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [fKey]: e.target.value })} /></td>
                                                    <td className="px-2 py-1">{cKey && <input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-amber-400 outline-none" placeholder="" value={formData[cKey as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [cKey]: e.target.value })} />}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── REVISIÓN POR SISTEMAS ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-1 pb-1 border-b border-red-200">Revisión por Sistemas</h4>
                                <p className="text-[0.65rem] text-slate-500 mb-2">¿Ha presentado síntomas en el último mes a nivel de...?</p>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-blue-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-44">Sistema</th>
                                                <th className="px-2 py-2 text-center w-12">SI</th>
                                                <th className="px-2 py-2 text-center w-12">NO</th>
                                                <th className="px-2 py-2 text-left">Ampliación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {([
                                                ["rev_organos_sentidos", "rev_organos_sentidos_amp", "ÓRGANOS DE LOS SENTIDOS"],
                                                ["rev_cardiovascular", "rev_cardiovascular_amp", "CARDIOVASCULAR"],
                                                ["rev_respiratorio", "rev_respiratorio_amp", "RESPIRATORIO"],
                                                ["rev_gastrointestinal", "rev_gastrointestinal_amp", "GASTROINTESTINAL"],
                                                ["rev_osteomuscular", "rev_osteomuscular_amp", "OSTEOMUSCULAR"],
                                            ] as [string, string, string][]).map(([vKey, aKey, label], i) => (
                                                <tr key={vKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{label}:</td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="SI" checked={formData[vKey as keyof typeof formData] === "SI"} onChange={() => setFormData({ ...formData, [vKey]: "SI" })} className="w-4 h-4 text-blue-600" /></td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="NO" checked={formData[vKey as keyof typeof formData] === "NO"} onChange={() => setFormData({ ...formData, [vKey]: "NO" })} className="w-4 h-4 text-blue-600" /></td>
                                                    <td className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-blue-400 outline-none" placeholder="Ampliar si es SI..." value={formData[aKey as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [aKey]: e.target.value })} /></td>
                                                </tr>
                                            ))}
                                            <tr className="bg-white">
                                                <td className="px-3 py-2 font-semibold text-slate-700">OTRO:</td>
                                                <td colSpan={3} className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-blue-400 outline-none" placeholder="Especificar..." value={formData.rev_otro} onChange={(e) => setFormData({ ...formData, rev_otro: e.target.value })} /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── ANTECEDENTES INMUNOLÓGICOS ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Antecedentes Inmunológicos</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-emerald-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-44">Vacuna</th>
                                                <th className="px-2 py-2 text-center w-12">SI</th>
                                                <th className="px-2 py-2 text-center w-12">NO</th>
                                                <th className="px-2 py-2 text-left">N° Dosis / Descripción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {([
                                                ["vac_tetanos", "vac_tetanos_dosis", "VACUNA CONTRA TÉTANOS"],
                                                ["vac_hepatitis_b", "vac_hepatitis_b_dosis", "VACUNA CONTRA HEPATITIS B"],
                                                ["vac_covid", "vac_covid_desc", "VACUNA CONTRA COVID-19"],
                                            ] as [string, string, string][]).map(([vKey, dKey, label], i) => (
                                                <tr key={vKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{label}:</td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="SI" checked={formData[vKey as keyof typeof formData] === "SI"} onChange={() => setFormData({ ...formData, [vKey]: "SI" })} className="w-4 h-4 text-emerald-600" /></td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="NO" checked={formData[vKey as keyof typeof formData] === "NO"} onChange={() => setFormData({ ...formData, [vKey]: "NO" })} className="w-4 h-4 text-emerald-600" /></td>
                                                    <td className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-emerald-400 outline-none" placeholder="" value={formData[dKey as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [dKey]: e.target.value })} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── SIGNOS VITALES ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Examen Físico — Signos Vitales</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    <div><label className="label-premium text-xs">Frec. Cardíaca</label><input type="text" className="input-premium text-xs" placeholder="lpm" value={formData.sv_fc} onChange={(e) => setFormData({ ...formData, sv_fc: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Frec. Respiratoria</label><input type="text" className="input-premium text-xs" placeholder="rpm" value={formData.sv_fr} onChange={(e) => setFormData({ ...formData, sv_fr: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Tensión Arterial</label><input type="text" className="input-premium text-xs" placeholder="120/80" value={formData.sv_ta} onChange={(e) => setFormData({ ...formData, sv_ta: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Sat. O₂ %</label><input type="text" className="input-premium text-xs" placeholder="%" value={formData.sv_sat_o2} onChange={(e) => setFormData({ ...formData, sv_sat_o2: e.target.value })} /></div>
                                    <div><label className="label-premium text-xs">Lateralidad</label>
                                        <select className="select-premium text-xs" value={formData.sv_lateralidad} onChange={(e) => setFormData({ ...formData, sv_lateralidad: e.target.value })}>
                                            <option value="DIESTRO">Diestro</option>
                                            <option value="ZURDO">Zurdo</option>
                                            <option value="AMBIDIESTRO">Ambidiestro</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── EXPLORACIÓN FÍSICA ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Exploración Física</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-purple-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-44">Órgano / Sistema</th>
                                                <th className="px-2 py-2 text-center w-20">NORMAL</th>
                                                <th className="px-2 py-2 text-center w-20">ANORMAL</th>
                                                <th className="px-2 py-2 text-left">Ampliación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {([
                                                ["exp_cabeza_cuello", "exp_cabeza_cuello_amp", "CABEZA Y CUELLO"],
                                                ["exp_torax", "exp_torax_amp", "TÓRAX"],
                                                ["exp_cardiorespiratorio", "exp_cardiorespiratorio_amp", "CARDIORESPIRATORIO"],
                                                ["exp_abdomen", "exp_abdomen_amp", "ABDOMEN"],
                                                ["exp_neurologico", "exp_neurologico_amp", "NEUROLÓGICO"],
                                                ["exp_organos_sentidos", "exp_organos_sentidos_amp", "ÓRGANOS DE LOS SENTIDOS"],
                                            ] as [string, string, string][]).map(([vKey, aKey, label], i) => (
                                                <tr key={vKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{label}:</td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="NORMAL" checked={formData[vKey as keyof typeof formData] === "NORMAL"} onChange={() => setFormData({ ...formData, [vKey]: "NORMAL" })} className="w-4 h-4 text-purple-600" /></td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="ANORMAL" checked={formData[vKey as keyof typeof formData] === "ANORMAL"} onChange={() => setFormData({ ...formData, [vKey]: "ANORMAL" })} className="w-4 h-4 text-red-500" /></td>
                                                    <td className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-purple-400 outline-none" placeholder="Ampliar si es anormal..." value={formData[aKey as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [aKey]: e.target.value })} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── ÉNFASIS OSTEOMUSCULAR ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Anexo Énfasis Osteomuscular</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-teal-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-44">Parámetro</th>
                                                <th className="px-2 py-2 text-center w-20">NORMAL</th>
                                                <th className="px-2 py-2 text-center w-20">ANORMAL</th>
                                                <th className="px-2 py-2 text-left">Ampliación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {([
                                                ["ost_osteomuscular", "ost_osteomuscular_amp", "OSTEOMUSCULAR"],
                                                ["ost_marcha", "ost_marcha_amp", "MARCHA"],
                                                ["ost_mmss", "ost_mmss_amp", "ARCOS DE MOV. MMSS"],
                                                ["ost_mmii", "ost_mmii_amp", "ARCOS DE MOV. MMII"],
                                                ["ost_columna", "ost_columna_amp", "ARCOS DE MOV. COLUMNA"],
                                                ["ost_fuerza", "ost_fuerza_amp", "FUERZA"],
                                                ["ost_flexibilidad", "ost_flexibilidad_amp", "FLEXIBILIDAD"],
                                            ] as [string, string, string][]).map(([vKey, aKey, label], i) => (
                                                <tr key={vKey} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{label}:</td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="NORMAL" checked={formData[vKey as keyof typeof formData] === "NORMAL"} onChange={() => setFormData({ ...formData, [vKey]: "NORMAL" })} className="w-4 h-4 text-teal-600" /></td>
                                                    <td className="px-2 py-2 text-center"><input type="radio" name={vKey} value="ANORMAL" checked={formData[vKey as keyof typeof formData] === "ANORMAL"} onChange={() => setFormData({ ...formData, [vKey]: "ANORMAL" })} className="w-4 h-4 text-red-500" /></td>
                                                    <td className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-teal-400 outline-none" placeholder="" value={formData[aKey as keyof typeof formData] as string} onChange={(e) => setFormData({ ...formData, [aKey]: e.target.value })} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* ── PRUEBAS VESTIBULARES ── */}
                            <div>
                                <h4 className="text-xs font-extrabold text-red-800 uppercase tracking-widest mb-3 pb-1 border-b border-red-200">Anexo Pruebas Vestibulares</h4>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-orange-50">
                                                <th className="text-left px-3 py-2 font-bold text-slate-700 w-44">Parámetro</th>
                                                <th className="px-2 py-2 text-center w-20">NORMAL</th>
                                                <th className="px-2 py-2 text-center w-20">ANORMAL</th>
                                                <th className="px-2 py-2 text-left">Ampliación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="bg-white">
                                                <td className="px-3 py-2 font-semibold text-slate-700">ESTRELLA DE BABINSKY WEIL:</td>
                                                <td className="px-2 py-2 text-center"><input type="radio" name="vest_babinsky" value="NORMAL" checked={formData.vest_babinsky === "NORMAL"} onChange={() => setFormData({ ...formData, vest_babinsky: "NORMAL" })} className="w-4 h-4 text-orange-600" /></td>
                                                <td className="px-2 py-2 text-center"><input type="radio" name="vest_babinsky" value="ANORMAL" checked={formData.vest_babinsky === "ANORMAL"} onChange={() => setFormData({ ...formData, vest_babinsky: "ANORMAL" })} className="w-4 h-4 text-red-500" /></td>
                                                <td className="px-2 py-1"><input type="text" className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:border-orange-400 outline-none" placeholder="" value={formData.vest_babinsky_amp} onChange={(e) => setFormData({ ...formData, vest_babinsky_amp: e.target.value })} /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* PASO 5 – Osteomuscular + Factores de Riesgo */}
                {paso === 5 && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Valoración Osteomuscular */}
                        <div className="section-premium">
                            <div className="section-header section-header-emerald">
                                <span className="text-lg">🦴</span>
                                <h3 className="text-sm font-bold text-emerald-900">Valoración Osteomuscular y Complementarios</h3>
                            </div>
                            <div className="section-body">
                                <label className="label-premium">Observaciones / Hallazgos Complementarios</label>
                                <textarea rows={3} className="input-premium" value={formData.valoracion_osteomuscular} onChange={(e) => setFormData({ ...formData, valoracion_osteomuscular: e.target.value })} placeholder="Arcos de movilidad, fuerza conservada, maniobras de Phalen/Tinel, exámenes complementarios..." />
                            </div>
                        </div>

                        {/* EXPOSICION A FACTORES DE RIESGOS DEL PUESTO DE TRABAJO */}
                        <div className="section-premium">
                            <div className="section-header section-header-amber">
                                <span className="text-lg">⚠️</span>
                                <h3 className="text-sm font-bold text-amber-900">Exposición a Factores de Riesgos del Puesto de Trabajo</h3>
                            </div>
                            <div className="section-body space-y-5">

                                {/* FÍSICO */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 pb-1 border-b border-amber-200">🌡️ Físico</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {([
                                            ["temperaturas_altas", "Temperaturas altas"],
                                            ["temperaturas_bajas", "Temperaturas bajas"],
                                            ["radiacion_ionizante", "Radiación Ionizante"],
                                            ["radiacion_no_ionizante", "Radiación No Ionizante"],
                                            ["ruido", "Ruido"],
                                            ["vibracion", "Vibración"],
                                            ["iluminacion", "Iluminación"],
                                            ["ventilacion", "Ventilación"],
                                            ["fluido_electrico", "Fluido eléctrico"],
                                            ["otros", "Otros"],
                                        ] as [string, string][]).map(([k, l]) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-amber-600 rounded"
                                                    checked={formData.riesgo_fisico[k as keyof typeof formData.riesgo_fisico]}
                                                    onChange={() => handleRiesgoDetalle("riesgo_fisico", k)} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* MECÁNICO */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 pb-1 border-b border-amber-200">⚙️ Mecánico</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {([
                                            ["atrap_maquinas", "Atrapamiento entre máquinas"],
                                            ["atrap_objetos", "Atrapamiento entre objetos"],
                                            ["caida_objetos", "Caída de objetos"],
                                            ["caidas_mismo_nivel", "Caídas al mismo nivel"],
                                            ["caidas_diferente_nivel", "Caídas a diferente nivel"],
                                            ["contacto_electrico", "Contacto Eléctrico"],
                                            ["proyeccion_particulas", "Proyección de partículas/fragmentos"],
                                            ["proyeccion_fluidos", "Proyección de fluidos"],
                                            ["pinchazos", "Pinchazos"],
                                            ["cortes", "Cortes"],
                                            ["atropellamiento", "Atropellamiento por vehículos"],
                                            ["colision_vehicular", "Choques / Colisión vehicular"],
                                            ["otros", "Otros"],
                                        ] as [string, string][]).map(([k, l]) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-amber-600 rounded"
                                                    checked={formData.riesgo_mecanico[k as keyof typeof formData.riesgo_mecanico]}
                                                    onChange={() => handleRiesgoDetalle("riesgo_mecanico", k)} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* QUÍMICO */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 pb-1 border-b border-amber-200">🧪 Químico</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {([
                                            ["solidos", "Sólidos"], ["polvos", "Polvos"], ["liquidos", "Líquidos"],
                                            ["humos", "Humos"], ["vapores", "Vapores"], ["aerosoles", "Aerosoles"],
                                            ["nieblas", "Nieblas"], ["gaseosos", "Gaseosos"], ["otros", "Otros"],
                                        ] as [string, string][]).map(([k, l]) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-amber-600 rounded"
                                                    checked={formData.riesgo_quimico[k as keyof typeof formData.riesgo_quimico]}
                                                    onChange={() => handleRiesgoDetalle("riesgo_quimico", k)} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* BIOLÓGICO */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 pb-1 border-b border-amber-200">🦠 Biológico</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {([
                                            ["virus", "Virus"], ["hongos", "Hongos"], ["parasitos", "Parásitos"],
                                            ["bacterias", "Bacterias"], ["vectores", "Exposición a vectores"],
                                            ["animales_domesticos", "Exposición a animales domésticos"], ["otros", "Otros"],
                                        ] as [string, string][]).map(([k, l]) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-amber-600 rounded"
                                                    checked={formData.riesgo_biologico[k as keyof typeof formData.riesgo_biologico]}
                                                    onChange={() => handleRiesgoDetalle("riesgo_biologico", k)} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* ERGONÓMICO */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 pb-1 border-b border-amber-200">💪 Ergonómico</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {([
                                            ["manejo_cargas", "Manejo Manual de cargas"],
                                            ["movimiento_repetitivo", "Movimiento repetitivo"],
                                            ["posturas_forzadas", "Posturas forzadas"],
                                            ["carga_estatica", "Carga estática"],
                                            ["otros", "Otros"],
                                        ] as [string, string][]).map(([k, l]) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-amber-600 rounded"
                                                    checked={formData.riesgo_ergonomico[k as keyof typeof formData.riesgo_ergonomico]}
                                                    onChange={() => handleRiesgoDetalle("riesgo_ergonomico", k)} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* PSICOSOCIAL */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-2 pb-1 border-b border-amber-200">🧠 Psicosocial</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        {([
                                            ["monotonia", "Monotonía del trabajo"],
                                            ["sobrecarga", "Sobrecarga laboral"],
                                            ["alta_responsabilidad", "Altas responsabilidades"],
                                            ["minuciosidad", "Minuciosidad de la tarea"],
                                            ["autonomia_decisiones", "Autonomía en la toma de decisiones"],
                                            ["supervision", "Supervisión y estilos de dirección"],
                                            ["conflicto_rol", "Conflicto de rol"],
                                            ["falta_claridad", "Falta de claridad en las funciones"],
                                            ["distribucion_trabajo", "Incorrecta distribución del trabajo"],
                                            ["turnos_rotativos", "Turnos rotativos"],
                                            ["otros", "Otros"],
                                        ] as [string, string][]).map(([k, l]) => (
                                            <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 text-amber-600 rounded"
                                                    checked={formData.riesgo_psicosocial[k as keyof typeof formData.riesgo_psicosocial]}
                                                    onChange={() => handleRiesgoDetalle("riesgo_psicosocial", k)} />
                                                <span className="text-xs text-slate-700">{l}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 6 */}
                {paso === 6 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="section-premium">
                            <div className="section-header section-header-blue">
                                <span className="text-lg">🏷️</span>
                                <h3 className="text-sm font-bold text-blue-900">Diagnósticos CIE-10</h3>
                            </div>
                            <div className="section-body">
                                <DiagnosticoCIE10Input seleccionados={diagnosticosCIE10} onChange={setDiagnosticosCIE10} />
                            </div>
                        </div>

                        <div className="section-premium">
                            <div className="section-header section-header-emerald">
                                <span className="text-lg">✍️</span>
                                <h3 className="text-sm font-bold text-emerald-900">Firma del Trabajador</h3>
                            </div>
                            <div className="section-body space-y-4">
                                {pacienteSeleccionado?.correo_electronico && (
                                    <label className="flex items-center gap-3 p-3.5 rounded-xl bg-sky-50 border border-sky-200 cursor-pointer hover:bg-sky-100/60 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={autoEnviarCorreo}
                                            onChange={(e) => setAutoEnviarCorreo(e.target.checked)}
                                            className="w-5 h-5 text-sky-600 rounded"
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-sky-900">📧 Enviar certificado automáticamente por correo</p>
                                            <p className="text-xs text-sky-700">
                                                Al guardar, el PDF del certificado y el enlace de verificación se enviarán a <strong>{pacienteSeleccionado.correo_electronico}</strong>
                                            </p>
                                        </div>
                                    </label>
                                )}
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setModoFirma("pad")} className={`px-4 py-2 rounded-lg text-xs font-bold ${modoFirma === "pad" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                                        ✏️ Dibujar Firma
                                    </button>
                                    <button type="button" onClick={() => setModoFirma("upload")} className={`px-4 py-2 rounded-lg text-xs font-bold ${modoFirma === "upload" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                                        📤 Subir Foto de Firma
                                    </button>
                                </div>

                                {modoFirma === "pad" ? (
                                    <SignaturePad ref={signatureRef} />
                                ) : (
                                    <div className="space-y-3">
                                        {firmaExistenteUrl && !firmaUpload && (
                                            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                <span className="text-xl">✅</span>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-emerald-800">Firma capturada en el portal de pre-atención</p>
                                                    <p className="text-[0.65rem] text-emerald-700">Se usará automáticamente en el certificado. Puede reemplazarla subiendo otra o dibujando una nueva.</p>
                                                </div>
                                                <img src={firmaExistenteUrl} alt="Firma precargada" className="h-12 object-contain bg-white rounded-lg border border-emerald-200" />
                                            </div>
                                        )}
                                        <input ref={firmaFileRef} type="file" accept="image/*" onChange={handleFirmaUpload} className="hidden" />
                                        <div onClick={() => firmaFileRef.current?.click()} className="w-full max-w-lg h-36 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-500">
                                            {firmaUpload ? <img src={firmaUpload} alt="Firma" className="h-full object-contain p-2" /> : <span className="text-xs text-slate-500">Clic para subir foto de firma manuscrita (o mantener la precargada)</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Nav buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setPaso(Math.max(1, paso - 1))} disabled={paso === 1} className="btn-secondary disabled:opacity-30">
                        ← Anterior
                    </button>
                    {paso < 6 ? (
                        <button type="button" onClick={() => setPaso(Math.min(6, paso + 1))} className="btn-primary">
                            Siguiente →
                        </button>
                    ) : (
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? "Guardando..." : "✅ Guardar y Generar Certificado"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}