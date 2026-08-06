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
        riesgos_ocupacionales: {
            fisico: false,
            mecanico: false,
            quimico: false,
            biologico: false,
            ergonomico: false,
            psicosocial: false
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

            // 4. Save Clinical History
            const historiaPromise = supabase.from("historia_clinica").insert({
                evaluacion_id: evaluacion.id,
                anamnesis: formData.anamnesis,
                hallazgos_examen_fisico: formData.hallazgos_examen_fisico,
                riesgos_ocupacionales: formData.riesgos_ocupacionales,
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
                        const data = await res.json();
                        toast.dismiss("enviando-cert");
                        if (res.ok) {
                            toast.success(data?.message || "✅ Certificado enviado por correo.");
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

                {/* PASO 4 */}
                {paso === 4 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-red">
                            <span className="text-lg">🔒</span>
                            <h3 className="text-sm font-bold text-red-900">Historia Clínica Ocupacional (Privada)</h3>
                        </div>
                        <div className="section-body space-y-4">
                            <div>
                                <label className="label-premium">Anamnesis y Antecedentes *</label>
                                <textarea required rows={4} className="input-premium" value={formData.anamnesis} onChange={(e) => setFormData({ ...formData, anamnesis: e.target.value })} placeholder="Exposición a riesgos, quirúrgicos, patológicos..." />
                            </div>
                            <div>
                                <label className="label-premium">Hallazgos Examen Físico *</label>
                                <textarea required rows={4} className="input-premium" value={formData.hallazgos_examen_fisico} onChange={(e) => setFormData({ ...formData, hallazgos_examen_fisico: e.target.value })} placeholder="Sistemas evaluados, tensión arterial, frecuencia cardíaca..." />
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 5 */}
                {paso === 5 && (
                    <div className="section-premium animate-fade-in">
                        <div className="section-header section-header-emerald">
                            <span className="text-lg">🦴</span>
                            <h3 className="text-sm font-bold text-emerald-900">Valoración Osteomuscular</h3>
                        </div>
                        <div className="section-body">
                            <textarea rows={4} className="input-premium" value={formData.valoracion_osteomuscular} onChange={(e) => setFormData({ ...formData, valoracion_osteomuscular: e.target.value })} placeholder="Arcos de movilidad, fuerza conservada, maniobras de Phalen/Tinel..." />
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