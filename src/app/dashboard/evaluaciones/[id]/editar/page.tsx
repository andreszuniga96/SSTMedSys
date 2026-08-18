"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
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

export default function EditarEvaluacion() {
    const router = useRouter();
    const params = useParams();
    const evaluacionId = params.id as string;
    const supabase = createClient();
    const signatureRef = useRef<SignaturePadRef>(null);
    const firmaFileRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [loadingDatos, setLoadingDatos] = useState(true);
    const [paso, setPaso] = useState(1);
    const [modoFirma, setModoFirma] = useState<"pad" | "upload">("upload");
    const [firmaUpload, setFirmaUpload] = useState<string | null>(null);
    const [firmaExistenteUrl, setFirmaExistenteUrl] = useState<string | null>(null);
    const [diagnosticosCIE10, setDiagnosticosCIE10] = useState<DiagnosticoCIE10[]>([]);
    const [evaluacionOriginal, setEvaluacionOriginal] = useState<any>(null);

    const [formData, setFormData] = useState({
        // Datos básicos
        tipo_evaluacion: "Pre ingreso",
        modalidad: "Presencial",
        enfasis: "",
        examen_nombre: "",
        hora_realizacion: "",
        // Empresa
        cargo: "",
        empresa_nombre: "",
        empresa_nit: "",
        fecha_ingreso: "",
        hora_ingreso: "",
        lugar_realizacion: "",
        entidad_realizadora: "",
        entidad_direccion: "",
        // Certificado / Valoración médica
        concepto_medico: "",
        aptitudes_tareas: "",
        ingreso_pve_preventivo: "",
        programa_promocion_prevencion: "",
        recomendaciones_generales: "",
        restricciones: "",
        clasificacion_gatiso: "",
        clasificacion_gatiso_tipo: "TLUD",
        clasificacion_gatiso_grupo: "No registra",
        remision_controles_eps: "",
        controles_arl: false,
        observaciones_medicas: "",
        recomendaciones_laborales: "",
        restricciones_laborales: "",
        otros_examenes_realizados: "",
        antecedentes_incidentes: "",
        antecedentes_enfermedad: "",
        antecedentes_secuelas: "",
        firma_paciente_nombre: "",
        firma_paciente_cedula: "",
        // Historia clínica (texto libre / JSON)
        anamnesis: "",
        hallazgos_examen_fisico: "",
        // Osteomuscular
        valoracion_osteomuscular: "",
    });

    // Cargar datos existentes
    useEffect(() => {
        const cargarDatos = async () => {
            setLoadingDatos(true);
            try {
                const [
                    { data: evaluacion },
                    { data: certificado },
                    { data: contexto },
                    { data: historia },
                    { data: osteo },
                ] = await Promise.all([
                    supabase.from("evaluaciones").select("*").eq("id", evaluacionId).single(),
                    supabase.from("certificados_aptitud").select("*").eq("evaluacion_id", evaluacionId).maybeSingle(),
                    supabase.from("contexto_laboral").select("*").eq("paciente_id", "placeholder").maybeSingle(), // cargamos después
                    supabase.from("historia_clinica").select("*").eq("evaluacion_id", evaluacionId).maybeSingle(),
                    supabase.from("valoracion_osteomuscular").select("*").eq("evaluacion_id", evaluacionId).maybeSingle(),
                ]);

                if (!evaluacion) {
                    toast.error("Evaluación no encontrada.");
                    router.push("/dashboard/evaluaciones");
                    return;
                }

                setEvaluacionOriginal(evaluacion);

                // Cargar contexto laboral del paciente
                const { data: contextoReal } = await supabase
                    .from("contexto_laboral")
                    .select("*")
                    .eq("paciente_id", evaluacion.paciente_id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // Poblar formData con los datos existentes
                setFormData({
                    tipo_evaluacion: evaluacion.tipo_evaluacion || "Pre ingreso",
                    modalidad: evaluacion.modalidad || "Presencial",
                    enfasis: evaluacion.enfasis || "",
                    examen_nombre: evaluacion.examen_nombre || "",
                    hora_realizacion: evaluacion.hora_realizacion || "",
                    cargo: contextoReal?.cargo || "",
                    empresa_nombre: contextoReal?.empresa_nombre || "",
                    empresa_nit: contextoReal?.empresa_nit || "",
                    fecha_ingreso: contextoReal?.fecha_ingreso || "",
                    hora_ingreso: contextoReal?.hora_ingreso || "",
                    lugar_realizacion: contextoReal?.lugar_realizacion || "",
                    entidad_realizadora: contextoReal?.entidad_realizadora || "",
                    entidad_direccion: contextoReal?.entidad_direccion || "",
                    concepto_medico: certificado?.concepto_medico || "",
                    aptitudes_tareas: certificado?.aptitudes_tareas || "",
                    ingreso_pve_preventivo: certificado?.ingreso_pve_preventivo || "",
                    programa_promocion_prevencion: certificado?.programa_promocion_prevencion || "",
                    recomendaciones_generales: certificado?.recomendaciones_generales || "",
                    restricciones: certificado?.restricciones || "",
                    clasificacion_gatiso: certificado?.clasificacion_gatiso || "",
                    clasificacion_gatiso_tipo: certificado?.clasificacion_gatiso_tipo || "TLUD",
                    clasificacion_gatiso_grupo: certificado?.clasificacion_gatiso_grupo || "No registra",
                    remision_controles_eps: certificado?.remision_controles_eps || "",
                    controles_arl: certificado?.controles_arl || false,
                    observaciones_medicas: certificado?.observaciones_medicas || "",
                    recomendaciones_laborales: certificado?.recomendaciones_laborales || "",
                    restricciones_laborales: certificado?.restricciones_laborales || "",
                    otros_examenes_realizados: certificado?.otros_examenes_realizados || "",
                    antecedentes_incidentes: certificado?.antecedentes_laborales?.incidentes || "",
                    antecedentes_enfermedad: certificado?.antecedentes_laborales?.enfermedad_profesional || "",
                    antecedentes_secuelas: certificado?.antecedentes_laborales?.secuelas || "",
                    firma_paciente_nombre: certificado?.firma_paciente_nombre || "",
                    firma_paciente_cedula: certificado?.firma_paciente_cedula || "",
                    anamnesis: historia?.anamnesis || "",
                    hallazgos_examen_fisico: historia?.hallazgos_examen_fisico || "",
                    valoracion_osteomuscular: osteo?.hallazgos || "",
                });

                // Cargar diagnósticos CIE-10
                if (certificado?.diagnosticos_cie10) {
                    setDiagnosticosCIE10(certificado.diagnosticos_cie10);
                }

                // Cargar firma existente
                if (certificado?.firma_paciente_url) {
                    setFirmaExistenteUrl(certificado.firma_paciente_url);
                    setModoFirma("upload");
                }

            } catch (err: any) {
                toast.error(`Error al cargar evaluación: ${err.message}`);
            } finally {
                setLoadingDatos(false);
            }
        };

        if (evaluacionId) cargarDatos();
    }, [evaluacionId]);

    const procesarYSubirFirma = async (base64Image: string) => {
        if (base64Image.startsWith("http")) return base64Image;
        const res = await fetch(base64Image);
        const blob = await res.blob();
        const rutaArchivo = `${evaluacionId}_firma_paciente_edit.png`;
        const { data, error } = await supabase.storage.from("firmas_biometricas").upload(rutaArchivo, blob, { contentType: "image/png", upsert: true });
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from("firmas_biometricas").getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    };

    const handleFirmaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setFirmaUpload(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (diagnosticosCIE10.length === 0) {
            toast.error("⚠️ Debe agregar al menos un Diagnóstico CIE-10 antes de guardar.");
            setPaso(3);
            return;
        }

        let signatureBase64: string | null = null;
        if (modoFirma === "pad") {
            signatureBase64 = signatureRef.current?.getSignature() || null;
        } else {
            signatureBase64 = firmaUpload || firmaExistenteUrl || null;
        }

        if (!signatureBase64 && formData.modalidad === "Presencial") {
            return toast.error("La firma del paciente es obligatoria.");
        }

        setLoading(true);
        try {
            // 1. Actualizar evaluación
            await supabase.from("evaluaciones").update({
                tipo_evaluacion: formData.tipo_evaluacion,
                modalidad: formData.modalidad,
                enfasis: formData.enfasis,
                examen_nombre: formData.examen_nombre,
                hora_realizacion: formData.hora_realizacion,
            }).eq("id", evaluacionId);

            // 2. Actualizar/subir firma
            let firmaUrl = firmaExistenteUrl;
            if (signatureBase64 && signatureBase64 !== firmaExistenteUrl) {
                firmaUrl = await procesarYSubirFirma(signatureBase64);
            }

            // 3. Actualizar contexto laboral del paciente
            if (evaluacionOriginal?.paciente_id) {
                await supabase.from("contexto_laboral").upsert({
                    paciente_id: evaluacionOriginal.paciente_id,
                    cargo: formData.cargo,
                    empresa_nombre: formData.empresa_nombre,
                    empresa_nit: formData.empresa_nit,
                    fecha_ingreso: formData.fecha_ingreso || null,
                    hora_ingreso: formData.hora_ingreso || null,
                    lugar_realizacion: formData.lugar_realizacion,
                    entidad_realizadora: formData.entidad_realizadora,
                    entidad_direccion: formData.entidad_direccion,
                }, { onConflict: "paciente_id" });
            }

            // 4. Actualizar historia clínica
            const { data: historiaExistente } = await supabase
                .from("historia_clinica")
                .select("id")
                .eq("evaluacion_id", evaluacionId)
                .maybeSingle();

            const historiaData = {
                evaluacion_id: evaluacionId,
                anamnesis: formData.anamnesis,
                hallazgos_examen_fisico: formData.hallazgos_examen_fisico,
            };

            if (historiaExistente?.id) {
                await supabase.from("historia_clinica").update(historiaData).eq("id", historiaExistente.id);
            } else {
                await supabase.from("historia_clinica").insert(historiaData);
            }

            // 5. Actualizar certificado
            const { data: certExistente } = await supabase
                .from("certificados_aptitud")
                .select("id")
                .eq("evaluacion_id", evaluacionId)
                .maybeSingle();

            const certificadoData = {
                evaluacion_id: evaluacionId,
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
            };

            if (certExistente?.id) {
                await supabase.from("certificados_aptitud").update(certificadoData).eq("id", certExistente.id);
            } else {
                await supabase.from("certificados_aptitud").insert(certificadoData);
            }

            // 6. Actualizar valoración osteomuscular
            if (formData.valoracion_osteomuscular) {
                const { data: osteoExistente } = await supabase
                    .from("valoracion_osteomuscular")
                    .select("id")
                    .eq("evaluacion_id", evaluacionId)
                    .maybeSingle();

                if (osteoExistente?.id) {
                    await supabase.from("valoracion_osteomuscular")
                        .update({ hallazgos: formData.valoracion_osteomuscular })
                        .eq("id", osteoExistente.id);
                } else {
                    await supabase.from("valoracion_osteomuscular").insert({
                        evaluacion_id: evaluacionId,
                        hallazgos: formData.valoracion_osteomuscular,
                    });
                }
            }

            toast.success("✅ Evaluación actualizada. El certificado PDF ahora refleja los cambios.");
            router.push("/dashboard/evaluaciones");
            router.refresh();
        } catch (error: any) {
            toast.error(`Error al actualizar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const pasos = [
        { num: 1, label: "Parámetros" },
        { num: 2, label: "Empresa" },
        { num: 3, label: "Diagnóstico y Certificado" },
        { num: 4, label: "Historia Clínica" },
        { num: 5, label: "Firma" },
    ];

    if (loadingDatos) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin" />
                <p className="text-slate-600 text-sm font-medium">Cargando datos de la evaluación...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span className="text-2xl">✏️</span>
                        Editar Evaluación Médica
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Los cambios actualizarán el certificado PDF automáticamente al guardar.
                    </p>
                </div>
                <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">
                    ← Cancelar
                </button>
            </div>

            {/* Banner de contexto */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <span className="text-lg">⚠️</span>
                <span>Está editando una evaluación existente. Solo modifique los campos que necesite corregir. Los demás se mantendrán igual.</span>
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

                {/* PASO 1: Parámetros básicos */}
                {paso === 1 && (
                    <div className="section-premium animate-fade-in">
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
                            <div className="md:col-span-2">
                                <label className="label-premium">Nombre del Examen</label>
                                <input type="text" className="input-premium" value={formData.examen_nombre} onChange={(e) => setFormData({ ...formData, examen_nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Hora de Realización</label>
                                <input type="time" className="input-premium" value={formData.hora_realizacion} onChange={(e) => setFormData({ ...formData, hora_realizacion: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 2: Empresa */}
                {paso === 2 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-amber">
                            <span className="text-lg">🏢</span>
                            <h3 className="text-sm font-bold text-amber-900">Datos de Empresa y Cargo</h3>
                        </div>
                        <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="md:col-span-2">
                                <label className="label-premium">Empresa Contratante</label>
                                <input type="text" className="input-premium" value={formData.empresa_nombre} onChange={(e) => setFormData({ ...formData, empresa_nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">NIT</label>
                                <input type="text" className="input-premium" value={formData.empresa_nit} onChange={(e) => setFormData({ ...formData, empresa_nit: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Cargo</label>
                                <input type="text" className="input-premium" value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Fecha de Ingreso</label>
                                <input type="date" className="input-premium" value={formData.fecha_ingreso} onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Lugar de Realización</label>
                                <input type="text" className="input-premium" value={formData.lugar_realizacion} onChange={(e) => setFormData({ ...formData, lugar_realizacion: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Entidad Realizadora</label>
                                <input type="text" className="input-premium" value={formData.entidad_realizadora} onChange={(e) => setFormData({ ...formData, entidad_realizadora: e.target.value })} />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 3: Diagnóstico y Certificado */}
                {paso === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Diagnósticos CIE-10 */}
                        <div className="section-premium">
                            <div className="section-header section-header-blue">
                                <span className="text-lg">🏷️</span>
                                <h3 className="text-sm font-bold text-blue-900">Diagnósticos CIE-10</h3>
                                {diagnosticosCIE10.length === 0 ? (
                                    <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                                        ⚠️ Obligatorio — agregue al menos 1
                                    </span>
                                ) : (
                                    <span className="ml-auto px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                        ✅ {diagnosticosCIE10.length} diagnóstico(s)
                                    </span>
                                )}
                            </div>
                            <div className="section-body">
                                <DiagnosticoCIE10Input seleccionados={diagnosticosCIE10} onChange={setDiagnosticosCIE10} />
                            </div>
                        </div>

                        {/* Valoración médica */}
                        <div className="section-premium">
                            <div className="section-header section-header-blue">
                                <span className="text-lg">📊</span>
                                <h3 className="text-sm font-bold text-blue-900">Valoración Médica (Certificado)</h3>
                            </div>
                            <div className="section-body space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="label-premium">Concepto Médico *</label>
                                        <select required className="select-premium font-bold text-blue-900" value={formData.concepto_medico} onChange={(e) => setFormData({ ...formData, concepto_medico: e.target.value })}>
                                            <option value="" disabled>Seleccione...</option>
                                            <option value="Apto">✅ Apto — Sin restricciones</option>
                                            <option value="Apto con Restricciones">⚠️ Apto con Restricciones</option>
                                            <option value="No Apto">❌ No Apto</option>
                                            <option value="Aplazado">⏳ Aplazado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-premium">Aptitudes y Tareas</label>
                                        <input type="text" className="input-premium" value={formData.aptitudes_tareas} onChange={(e) => setFormData({ ...formData, aptitudes_tareas: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium">Ingreso PVE Preventivo</label>
                                        <input type="text" className="input-premium" value={formData.ingreso_pve_preventivo} onChange={(e) => setFormData({ ...formData, ingreso_pve_preventivo: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium">Programa Promoción y Prevención</label>
                                        <input type="text" className="input-premium" value={formData.programa_promocion_prevencion} onChange={(e) => setFormData({ ...formData, programa_promocion_prevencion: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium">Clasificación GATISO</label>
                                        <select className="select-premium" value={formData.clasificacion_gatiso} onChange={(e) => setFormData({ ...formData, clasificacion_gatiso: e.target.value })}>
                                            <option value="">N/A</option>
                                            <option value="Osteomuscular">Osteomuscular</option>
                                            <option value="Cardiovascular">Cardiovascular</option>
                                            <option value="Auditivo">Auditivo</option>
                                            <option value="Visual">Visual</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-premium">Remisión a Controles EPS</label>
                                        <input type="text" className="input-premium" value={formData.remision_controles_eps} onChange={(e) => setFormData({ ...formData, remision_controles_eps: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium flex items-center gap-2 mt-6">
                                            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={formData.controles_arl} onChange={(e) => setFormData({ ...formData, controles_arl: e.target.checked })} />
                                            Requiere Controles ARL
                                        </label>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="label-premium">Observaciones Médicas</label>
                                        <textarea rows={2} className="input-premium" value={formData.observaciones_medicas} onChange={(e) => setFormData({ ...formData, observaciones_medicas: e.target.value })} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="label-premium">Otros Exámenes Realizados</label>
                                        <textarea rows={2} className="input-premium" value={formData.otros_examenes_realizados} onChange={(e) => setFormData({ ...formData, otros_examenes_realizados: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label-premium">Recomendaciones y Medidas Preventivas</label>
                                    <DiccionarioSelector tipo="recomendacion" valorActual={formData.recomendaciones_generales} onInsertar={(texto) => setFormData({ ...formData, recomendaciones_generales: texto })} />
                                    <textarea rows={3} className="input-premium" value={formData.recomendaciones_generales} onChange={(e) => setFormData({ ...formData, recomendaciones_generales: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Restricciones Laborales</label>
                                    <DiccionarioSelector tipo="restriccion" valorActual={formData.restricciones} onInsertar={(texto) => setFormData({ ...formData, restricciones: texto })} />
                                    <textarea rows={2} className="input-premium" value={formData.restricciones} onChange={(e) => setFormData({ ...formData, restricciones: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 4: Historia Clínica */}
                {paso === 4 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-red">
                            <span className="text-lg">🔒</span>
                            <h3 className="text-sm font-bold text-red-900">Historia Clínica (Privada)</h3>
                        </div>
                        <div className="section-body space-y-4">
                            <div>
                                <label className="label-premium">Anamnesis y Antecedentes</label>
                                <textarea rows={5} className="input-premium" value={formData.anamnesis} onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })} placeholder="Antecedentes personales, familiares, hábitos, signos vitales..." />
                            </div>
                            <div>
                                <label className="label-premium">Hallazgos Examen Físico</label>
                                <textarea rows={4} className="input-premium" value={formData.hallazgos_examen_fisico} onChange={(e) => setFormData({ ...formData, hallazgos_examen_fisico: e.target.value })} placeholder="Exploración física, osteomuscular, vestibular..." />
                            </div>
                            <div>
                                <label className="label-premium">Valoración Osteomuscular y Complementarios</label>
                                <textarea rows={3} className="input-premium" value={formData.valoracion_osteomuscular} onChange={(e) => setFormData({ ...formData, valoracion_osteomuscular: e.target.value })} placeholder="Arcos de movilidad, fuerza, exámenes complementarios..." />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 5: Firma */}
                {paso === 5 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-emerald">
                            <span className="text-lg">✍️</span>
                            <h3 className="text-sm font-bold text-emerald-900">Firma del Trabajador</h3>
                        </div>
                        <div className="section-body space-y-4">
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setModoFirma("pad")} className={`px-4 py-2 rounded-lg text-xs font-bold ${modoFirma === "pad" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                                    ✏️ Dibujar Firma
                                </button>
                                <button type="button" onClick={() => setModoFirma("upload")} className={`px-4 py-2 rounded-lg text-xs font-bold ${modoFirma === "upload" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                                    📤 Subir/Ver Firma
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
                                                <p className="text-xs font-bold text-emerald-800">Firma registrada anteriormente</p>
                                                <p className="text-[0.65rem] text-emerald-700">Se usará esta firma en el certificado actualizado. Puede reemplazarla.</p>
                                            </div>
                                            <img src={firmaExistenteUrl} alt="Firma actual" className="h-12 object-contain bg-white rounded-lg border border-emerald-200" />
                                        </div>
                                    )}
                                    <input ref={firmaFileRef} type="file" accept="image/*" onChange={handleFirmaUpload} className="hidden" />
                                    <div onClick={() => firmaFileRef.current?.click()} className="w-full max-w-lg h-36 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                                        {firmaUpload
                                            ? <img src={firmaUpload} alt="Firma nueva" className="h-full object-contain p-2" />
                                            : <span className="text-xs text-slate-500">Clic para subir nueva foto de firma (opcional — si no cambia, se mantiene la anterior)</span>
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Resumen antes de guardar */}
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <p className="text-xs font-bold text-slate-700">📋 Resumen de cambios a guardar:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                    <span>• Concepto: <strong>{formData.concepto_medico || "—"}</strong></span>
                                    <span>• Diagnósticos CIE-10: <strong className={diagnosticosCIE10.length === 0 ? "text-red-600" : "text-green-600"}>{diagnosticosCIE10.length} agregado(s)</strong></span>
                                    <span>• Tipo: <strong>{formData.tipo_evaluacion}</strong></span>
                                    <span>• Firma: <strong>{firmaUpload ? "Nueva" : firmaExistenteUrl ? "Existente" : "Sin firma"}</strong></span>
                                </div>
                                {diagnosticosCIE10.length === 0 && (
                                    <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                        <span>⚠️</span>
                                        <p className="text-xs text-red-700 font-semibold">Vuelva al Paso 3 y agregue al menos un Diagnóstico CIE-10 para poder guardar.</p>
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
                    {paso < 5 ? (
                        <button type="button" onClick={() => setPaso(Math.min(5, paso + 1))} className="btn-primary">
                            Siguiente →
                        </button>
                    ) : (
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? "Guardando..." : "💾 Guardar Cambios y Actualizar Certificado"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
