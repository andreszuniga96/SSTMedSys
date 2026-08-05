"use client";

import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface PacienteFormProps {
    pacienteInicial?: any;
    isEditing?: boolean;
}

export default function PacienteForm({ pacienteInicial, isEditing = false }: PacienteFormProps) {
    const router = useRouter();
    const webcamRef = useRef<Webcam>(null);

    const [formData, setFormData] = useState({
        nombre_completo: pacienteInicial?.nombre_completo || "",
        tipo_documento: pacienteInicial?.tipo_documento || "CC",
        documento_identidad: pacienteInicial?.documento_identidad || "",
        fecha_nacimiento: pacienteInicial?.fecha_nacimiento || "",
        genero: pacienteInicial?.genero || "Femenino",
        movil: pacienteInicial?.movil || "",
        telefono_fijo: pacienteInicial?.telefono_fijo || "",
        correo_electronico: pacienteInicial?.correo_electronico || "",
        lugar_nacimiento: pacienteInicial?.lugar_nacimiento || "",
        lugar_residencia: pacienteInicial?.lugar_residencia || "Pasto",
        direccion: pacienteInicial?.direccion || "",
        estado_civil: pacienteInicial?.estado_civil || "",
        escolaridad: pacienteInicial?.escolaridad || "Bachiller",
        grupo_sanguineo: pacienteInicial?.grupo_sanguineo || "",
        hijos: pacienteInicial?.hijos || "No refiere",
        eps: pacienteInicial?.eps || "",
        arl: pacienteInicial?.arl || "",
        regimen: pacienteInicial?.regimen || "Contributivo",
        fondo_pension: pacienteInicial?.fondo_pension || "",
        profesion: pacienteInicial?.profesion || "",
        estrato: pacienteInicial?.estrato || 1,
        zona: pacienteInicial?.zona || "Urbana",
        grupo_etnico: pacienteInicial?.grupo_etnico || "No Refiere",
        discapacitado: pacienteInicial?.discapacitado || false,
        imc: pacienteInicial?.imc || "",
    });

    const [peso, setPeso] = useState<string>("");
    const [estatura, setEstatura] = useState<string>("");

    useEffect(() => {
        const p = parseFloat(peso);
        const e = parseFloat(estatura);
        if (p > 0 && e > 0) {
            const calculatedImc = (p / (e * e)).toFixed(2);
            setFormData(prev => ({ ...prev, imc: calculatedImc }));
        }
    }, [peso, estatura]);

    const [capturaFoto, setCapturaFoto] = useState<string | null>(pacienteInicial?.foto_url || null);
    const [guardando, setGuardando] = useState(false);

    const capturarFoto = () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCapturaFoto(imageSrc);
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);

        try {
            const supabase = createClient();
            let finalFotoUrl = capturaFoto;

            // Subir foto si es base64
            if (capturaFoto && capturaFoto.startsWith("data:image")) {
                const res = await fetch(capturaFoto);
                const blob = await res.blob();

                const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
                const compressedFile = await imageCompression(blob as File, options);

                const fileName = `foto_${Date.now()}_${formData.documento_identidad}.jpg`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("pacientes_fotos")
                    .upload(fileName, compressedFile, { contentType: "image/jpeg", upsert: true });

                if (!uploadError && uploadData) {
                    const { data: publicUrlData } = supabase.storage.from("pacientes_fotos").getPublicUrl(fileName);
                    finalFotoUrl = publicUrlData.publicUrl;
                }
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error("No hay un usuario (médico) autenticado.");
            }

            const payload = {
                ...formData,
                foto_url: finalFotoUrl,
                medico_id: user.id
            };

            if (isEditing && pacienteInicial?.id) {
                let { error } = await supabase.from("pacientes").update(payload).eq("id", pacienteInicial.id);
                if (error && (error.code === 'PGRST204' || error.message?.includes('Could not find'))) {
                    // Fallback to core fields if database schema hasn't executed migration script yet
                    const corePayload = {
                        nombre_completo: formData.nombre_completo,
                        documento_identidad: formData.documento_identidad,
                        fecha_nacimiento: formData.fecha_nacimiento,
                        genero: formData.genero,
                        movil: formData.movil,
                        eps: formData.eps,
                        arl: formData.arl,
                        fondo_pension: formData.fondo_pension,
                        profesion: formData.profesion,
                        direccion: formData.direccion,
                        foto_url: finalFotoUrl,
                        medico_id: user.id
                    };
                    const resFallback = await supabase.from("pacientes").update(corePayload).eq("id", pacienteInicial.id);
                    if (resFallback.error) throw resFallback.error;
                } else if (error) {
                    throw error;
                }
            } else {
                let { error } = await supabase.from("pacientes").insert([payload]);
                if (error && (error.code === 'PGRST204' || error.message?.includes('Could not find'))) {
                    // Fallback to core fields if database schema hasn't executed migration script yet
                    const corePayload = {
                        nombre_completo: formData.nombre_completo,
                        documento_identidad: formData.documento_identidad,
                        fecha_nacimiento: formData.fecha_nacimiento,
                        genero: formData.genero,
                        movil: formData.movil,
                        eps: formData.eps,
                        arl: formData.arl,
                        fondo_pension: formData.fondo_pension,
                        profesion: formData.profesion,
                        direccion: formData.direccion,
                        foto_url: finalFotoUrl,
                        medico_id: user.id
                    };
                    const resFallback = await supabase.from("pacientes").insert([corePayload]);
                    if (resFallback.error) throw resFallback.error;
                } else if (error) {
                    throw error;
                }
            }

            toast.success(isEditing ? "Paciente actualizado correctamente" : "Paciente registrado exitosamente");
            router.push("/dashboard/pacientes");
            router.refresh();
        } catch (err: any) {
            console.error("Error guardando paciente:", err);
            if (err.message?.includes("schema cache")) {
                toast.error("Faltan las columnas extendidas en la base de datos. Ejecuta el script SQL.");
            } else {
                toast.error("Ocurrió un error al guardar los datos del paciente.");
            }
        } finally {
            setGuardando(false);
        }
    };

    // Forzar actualización de cache HMR
    console.log("PacienteForm cargado con soporte de fallback SQL");

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
            {/* Header Sticky Bar */}
            <div className="card-premium p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-4 z-20 bg-white/95 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/pacientes" className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            {isEditing ? `Editar Paciente: ${pacienteInicial?.nombre_completo}` : "Registrar Nuevo Paciente"}
                        </h1>
                        <p className="text-xs text-slate-500">Diligencie la información médica y administrativa del trabajador</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/pacientes" className="btn-secondary text-sm">
                        Cancelar
                    </Link>
                    <button type="submit" disabled={guardando} className="btn-primary text-sm">
                        {guardando ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Paciente"}
                    </button>
                </div>
            </div>

            {/* SECCIÓN 1: FOTO Y BIOMETRÍA */}
            <div className="section-premium">
                <div className="section-header section-header-blue">
                    <span className="text-xl">📸</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">1. Foto Biométrica del Trabajador</h2>
                        <p className="text-[0.7rem] text-slate-500">Captura en vivo para identificación en historia clínica y PDF</p>
                    </div>
                </div>
                <div className="section-body flex flex-col md:flex-row items-center gap-6">
                    <div className="w-40 h-40 bg-slate-900 rounded-2xl overflow-hidden relative flex-shrink-0 shadow-inner border-2 border-slate-200">
                        {!capturaFoto ? (
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                        ) : (
                            <img src={capturaFoto} alt="Foto Paciente" className="w-full h-full object-cover" />
                        )}
                    </div>
                    <div className="space-y-3 text-center md:text-left">
                        <p className="text-xs text-slate-600 max-w-md">
                            Asegúrese de que el trabajador esté enfocado adecuadamente antes de tomar la fotografía biométrica.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            {!capturaFoto ? (
                                <button type="button" onClick={capturarFoto} className="btn-primary text-xs">
                                    📸 Tomar Fotografía
                                </button>
                            ) : (
                                <button type="button" onClick={() => setCapturaFoto(null)} className="btn-danger text-xs">
                                    🔄 Repetir Fotografía
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: DATOS DE IDENTIFICACIÓN */}
            <div className="section-premium">
                <div className="section-header section-header-purple">
                    <span className="text-xl">👤</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">2. Datos de Identificación Personal</h2>
                        <p className="text-[0.7rem] text-slate-500">Información básica oficial del trabajador</p>
                    </div>
                </div>
                <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2">
                        <label className="label-premium">Nombre Completo *</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="Ej. Juan Carlos Pérez Gómez"
                            value={formData.nombre_completo}
                            onChange={(e) => updateField("nombre_completo", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Tipo de Documento *</label>
                        <select className="select-premium" value={formData.tipo_documento} onChange={(e) => updateField("tipo_documento", e.target.value)}>
                            <option value="CC">Cédula de Ciudadanía (CC)</option>
                            <option value="CE">Cédula de Extranjería (CE)</option>
                            <option value="TI">Tarjeta de Identidad (TI)</option>
                            <option value="PA">Pasaporte (PA)</option>
                            <option value="PPT">Permiso por Protección Temporal (PPT)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Número de Documento *</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="Ej. 1085234901"
                            value={formData.documento_identidad}
                            onChange={(e) => updateField("documento_identidad", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Fecha de Nacimiento *</label>
                        <input
                            type="date"
                            required
                            className="input-premium"
                            value={formData.fecha_nacimiento}
                            onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Género *</label>
                        <select className="select-premium" value={formData.genero} onChange={(e) => updateField("genero", e.target.value)}>
                            <option value="Femenino">Femenino</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Lugar de Nacimiento</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Ej. Pasto, Nariño"
                            value={formData.lugar_nacimiento}
                            onChange={(e) => updateField("lugar_nacimiento", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Estado Civil</label>
                        <input
                            list="estado_civil_opts"
                            className="input-premium"
                            placeholder="Seleccione o escriba..."
                            value={formData.estado_civil}
                            onChange={(e) => updateField("estado_civil", e.target.value)}
                        />
                        <datalist id="estado_civil_opts">
                            <option value="Soltero(a)" />
                            <option value="Casado(a)" />
                            <option value="Unión Libre" />
                            <option value="Separado(a)" />
                            <option value="Viudo(a)" />
                        </datalist>
                    </div>
                    <div>
                        <label className="label-premium">Escolaridad</label>
                        <input
                            list="escolaridad_opts"
                            className="input-premium"
                            placeholder="Seleccione o escriba..."
                            value={formData.escolaridad}
                            onChange={(e) => updateField("escolaridad", e.target.value)}
                        />
                        <datalist id="escolaridad_opts">
                            <option value="Ninguna" />
                            <option value="Primaria" />
                            <option value="Secundaria" />
                            <option value="Bachiller" />
                            <option value="Técnico / Tecnólogo" />
                            <option value="Universitario" />
                            <option value="Postgrado" />
                        </datalist>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: CONTACTO Y UBICACIÓN */}
            <div className="section-premium">
                <div className="section-header section-header-emerald">
                    <span className="text-xl">📍</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">3. Contacto y Residencia</h2>
                        <p className="text-[0.7rem] text-slate-500">Ubicación y vías de contacto del trabajador</p>
                    </div>
                </div>
                <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="label-premium">Teléfono Celular *</label>
                        <input
                            type="tel"
                            required
                            className="input-premium"
                            placeholder="Ej. 3001234567"
                            value={formData.movil}
                            onChange={(e) => updateField("movil", e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="label-premium">Correo Electrónico</label>
                        <input
                            type="email"
                            className="input-premium"
                            placeholder="paciente@ejemplo.com"
                            value={formData.correo_electronico}
                            onChange={(e) => updateField("correo_electronico", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Ciudad / Lugar de Residencia</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Ej. Pasto, Nariño"
                            value={formData.lugar_residencia}
                            onChange={(e) => updateField("lugar_residencia", e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="label-premium">Dirección de Residencia</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Ej. Calle 18 # 24-32 Barrio Centro"
                            value={formData.direccion}
                            onChange={(e) => updateField("direccion", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Teléfono Fijo</label>
                        <input
                            type="tel"
                            className="input-premium"
                            placeholder="Ej. 7234567"
                            value={formData.telefono_fijo}
                            onChange={(e) => updateField("telefono_fijo", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Estrato</label>
                        <input
                            list="estrato_opts"
                            type="number"
                            className="input-premium"
                            placeholder="Ej. 1, 2, 3..."
                            value={formData.estrato}
                            onChange={(e) => updateField("estrato", e.target.value)}
                        />
                        <datalist id="estrato_opts">
                            <option value="1" />
                            <option value="2" />
                            <option value="3" />
                            <option value="4" />
                            <option value="5" />
                            <option value="6" />
                        </datalist>
                    </div>
                    <div>
                        <label className="label-premium">Zona de Residencia</label>
                        <input
                            list="zona_opts"
                            className="input-premium"
                            placeholder="Urbana / Rural"
                            value={formData.zona}
                            onChange={(e) => updateField("zona", e.target.value)}
                        />
                        <datalist id="zona_opts">
                            <option value="Urbana" />
                            <option value="Rural" />
                        </datalist>
                    </div>
                    <div>
                        <label className="label-premium">Grupo Étnico</label>
                        <input
                            list="etnia_opts"
                            className="input-premium"
                            placeholder="Seleccione o escriba..."
                            value={formData.grupo_etnico}
                            onChange={(e) => updateField("grupo_etnico", e.target.value)}
                        />
                        <datalist id="etnia_opts">
                            <option value="No Refiere" />
                            <option value="Mestizo" />
                            <option value="Indígena" />
                            <option value="Afrocolombiano" />
                            <option value="Raizal" />
                            <option value="Palenquero" />
                            <option value="Rom" />
                        </datalist>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="discapacitado"
                            className="w-5 h-5 text-blue-600 rounded"
                            checked={formData.discapacitado}
                            onChange={(e) => updateField("discapacitado", e.target.checked as any)}
                        />
                        <label htmlFor="discapacitado" className="label-premium !mb-0 cursor-pointer">
                            Paciente con Discapacidad
                        </label>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 4: SEGURIDAD SOCIAL Y OCUPACIÓN */}
            <div className="section-premium">
                <div className="section-header section-header-amber">
                    <span className="text-xl">🏥</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">4. Seguridad Social y Cargo Ocupacional</h2>
                        <p className="text-[0.7rem] text-slate-500">Afiliaciones del Sistema General de Seguridad Social (SGSSS)</p>
                    </div>
                </div>
                <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="label-premium">EPS (Entidad Promotora Salud) *</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="Ej. Sanitas, Nueva EPS, Sura..."
                            value={formData.eps}
                            onChange={(e) => updateField("eps", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">ARL (Riesgos Laborales) *</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="Ej. Positiva, Sura, AXA Colpatria..."
                            value={formData.arl}
                            onChange={(e) => updateField("arl", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Fondo de Pensiones *</label>
                        <input
                            type="text"
                            required
                            className="input-premium"
                            placeholder="Ej. Porvenir, Proteccion, Colpensiones..."
                            value={formData.fondo_pension}
                            onChange={(e) => updateField("fondo_pension", e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="label-premium">Profesión / Cargo a Desempeñar</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Ej. Operativo de Montacargas, Auxiliar Administrativo..."
                            value={formData.profesion}
                            onChange={(e) => updateField("profesion", e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Régimen en Salud</label>
                        <input
                            list="regimen_opts"
                            className="input-premium"
                            placeholder="Ej. Contributivo, Subsidiado..."
                            value={formData.regimen}
                            onChange={(e) => updateField("regimen", e.target.value)}
                        />
                        <datalist id="regimen_opts">
                            <option value="Contributivo" />
                            <option value="Subsidiado" />
                            <option value="Especial" />
                            <option value="Vinculado" />
                        </datalist>
                    </div>
                    <div>
                        <label className="label-premium">Grupo Sanguíneo (Hemoclasificación)</label>
                        <input
                            list="sangre_opts"
                            className="input-premium"
                            placeholder="Ej. O+, A-..."
                            value={formData.grupo_sanguineo}
                            onChange={(e) => updateField("grupo_sanguineo", e.target.value)}
                        />
                        <datalist id="sangre_opts">
                            <option value="O+" />
                            <option value="O-" />
                            <option value="A+" />
                            <option value="A-" />
                            <option value="B+" />
                            <option value="B-" />
                            <option value="AB+" />
                            <option value="AB-" />
                        </datalist>
                    </div>
                    <div>
                        <label className="label-premium">Número de Hijos</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Ej. 0, 1, 2..."
                            value={formData.hijos}
                            onChange={(e) => updateField("hijos", e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 5: BIOMETRÍA Y ANTROPOMETRÍA */}
            <div className="section-premium">
                <div className="section-header section-header-blue">
                    <span className="text-xl">⚖️</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">5. Biometría y Antropometría</h2>
                        <p className="text-[0.7rem] text-slate-500">Datos para el cálculo automático del IMC</p>
                    </div>
                </div>
                <div className="section-body grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="label-premium">Peso (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            className="input-premium"
                            placeholder="Ej. 75.5"
                            value={peso}
                            onChange={(e) => setPeso(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Estatura (m)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-premium"
                            placeholder="Ej. 1.75"
                            value={estatura}
                            onChange={(e) => setEstatura(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-premium">IMC Calculado</label>
                        <input
                            type="text"
                            readOnly
                            className="input-premium bg-slate-100 font-bold text-blue-800"
                            placeholder="Auto"
                            value={formData.imc}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4">
                <Link href="/dashboard/pacientes" className="btn-secondary">
                    Cancelar
                </Link>
                <button type="submit" disabled={guardando} className="btn-primary">
                    {guardando ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Paciente"}
                </button>
            </div>
        </form>
    );
}
