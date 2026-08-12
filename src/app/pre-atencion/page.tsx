"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import WebcamCapture, { type WebcamCaptureRef } from "@/components/WebcamCapture";
import type { SignaturePadRef } from "@/components/SignaturePad";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const SignaturePad = dynamic(() => import("@/components/SignaturePad"), {
    ssr: false,
    loading: () => <div className="h-52 w-full shimmer rounded-lg" />,
});

const leerParametrosIniciales = () => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
        nombre: params.get("nombre") || "",
        cedula: params.get("cedula") || "",
        telefono: params.get("telefono") || "",
        correo: params.get("correo") || "",
        empresa: params.get("empresa") || "",
        cargo: params.get("cargo") || "",
        eps: params.get("eps") || "",
        arl: params.get("arl") || "",
        fecha_nacimiento: params.get("fecha_nacimiento") || "",
        genero: params.get("genero") || "Femenino",
        ciudad: params.get("ciudad") || "",
        direccion: params.get("direccion") || "",
    };
};

export default function PortalPreAtencion() {
    const supabase = createClient();
    const webcamRef = useRef<WebcamCaptureRef>(null);
    const firmaPadRef = useRef<SignaturePadRef>(null);

    const [paso, setPaso] = useState(1);
    const [loading, setLoading] = useState(false);
    const [completado, setCompletado] = useState(false);

    // Form state
    const [nombre, setNombre] = useState("");
    const [cedula, setCedula] = useState("");
    const [telefono, setTelefono] = useState("");
    const [correo, setCorreo] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [cargo, setCargo] = useState("");
    const [eps, setEps] = useState("");
    const [arl, setArl] = useState("");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [genero, setGenero] = useState("Femenino");
    const [ciudad, setCiudad] = useState("");
    const [direccion, setDireccion] = useState("");
    const [consentimiento, setConsentimiento] = useState(false);

    // Prellenar el formulario con los datos que la Dra. incluyó en el enlace (WhatsApp/Correo)
    useEffect(() => {
        const inicial = leerParametrosIniciales();
        if (inicial.nombre) setNombre(inicial.nombre);
        if (inicial.cedula) setCedula(inicial.cedula);
        if (inicial.telefono) setTelefono(inicial.telefono);
        if (inicial.correo) setCorreo(inicial.correo);
        if (inicial.empresa) setEmpresa(inicial.empresa);
        if (inicial.cargo) setCargo(inicial.cargo);
        if (inicial.eps) setEps(inicial.eps);
        if (inicial.arl) setArl(inicial.arl);
        if (inicial.fecha_nacimiento) setFechaNacimiento(inicial.fecha_nacimiento);
        if (inicial.genero) setGenero(inicial.genero);
        if (inicial.ciudad) setCiudad(inicial.ciudad);
        if (inicial.direccion) setDireccion(inicial.direccion);
    }, []);

    // Images state
    const [cedulaFoto, setCedulaFoto] = useState<string | null>(null);
    const [selfieFoto, setSelfieFoto] = useState<string | null>(null);
    const [firmaFoto, setFirmaFoto] = useState<string | null>(null);
    const [modoFirmaPortal, setModoFirmaPortal] = useState<"foto" | "pad">("foto");
    const [selfieError, setSelfieError] = useState<string | null>(null);
    const [examenesFotos, setExamenesFotos] = useState<string[]>([]);
    const [comprobantePago, setComprobantePago] = useState<string | null>(null);

    const [tomandoSelfie, setTomandoSelfie] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setter(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleExamenesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setExamenesFotos((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const capturarSelfie = () => {
        const src = webcamRef.current?.capture();
        if (src) {
            setSelfieFoto(src);
            setTomandoSelfie(false);
        } else {
            toast.error("No se pudo capturar. Verifique el permiso de la cámara.");
        }
    };

    const base64ToBlob = (base64: string) => {
        const byteString = atob(base64.split(",")[1]);
        const mimeString = base64.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        return new Blob([ab], { type: mimeString });
    };

    const subirArchivo = async (base64: string, prefijo: string, esImagen: boolean = true) => {
        const blob = base64ToBlob(base64);
        const mime = blob.type || (esImagen ? "image/jpeg" : "application/pdf");
        const ext = esImagen ? "jpg" : (mime === "application/pdf" ? "pdf" : "bin");
        let archivoFinal: Blob = blob;
        if (esImagen) {
            const file = new File([blob], `${prefijo}_${Date.now()}.${ext}`, { type: mime });
            archivoFinal = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024 });
        }
        const path = `${cedula}_${prefijo}_${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from("biometria_pacientes").upload(path, archivoFinal, { contentType: mime });
        if (error) throw error;
        return data.path;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const firmaParaSubir = modoFirmaPortal === "pad" ? (firmaPadRef.current?.getSignature() || null) : firmaFoto;
        if (!nombre || !cedula) return toast.error("Por favor complete su nombre y número de cédula.");
        if (!cedulaFoto || !firmaParaSubir) return toast.error("Por favor adjunte la foto de su cédula y su firma (foto o en pantalla).");

        setLoading(true);
        try {
            // Upload images
            const cedulaUrl = await subirArchivo(cedulaFoto, "cedula");
            const selfieUrl = selfieFoto ? await subirArchivo(selfieFoto, "selfie") : null;
            const firmaUrl = await subirArchivo(firmaParaSubir, "firma");
            const examenesUrls: string[] = [];
            for (const examen of examenesFotos) {
                const esImg = examen.startsWith("data:image");
                examenesUrls.push(await subirArchivo(examen, "examen", esImg));
            }
            let pagoUrl = null;
            if (comprobantePago) {
                pagoUrl = await subirArchivo(comprobantePago, "pago");
            }

            // Save record
            const { error } = await supabase.from("solicitudes_preatencion").insert({
                paciente_nombre: nombre,
                paciente_cedula: cedula,
                paciente_telefono: telefono,
                correo_electronico: correo,
                fecha_nacimiento: fechaNacimiento || null,
                genero: genero,
                eps: eps,
                arl: arl,
                empresa_nombre: empresa,
                cargo: cargo,
                lugar_residencia: ciudad,
                direccion: direccion,
                cedula_foto_url: cedulaUrl,
                selfie_foto_url: selfieUrl,
                firma_foto_url: firmaUrl,
                examenes_urls: examenesUrls,
                comprobante_pago_url: pagoUrl,
                estado: "completada",
            });

            if (error) throw error;

            setCompletado(true);
        } catch (err: any) {
            toast.error(`Error al enviar datos: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (completado) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-teal-50 text-slate-900">
                <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-2xl border border-teal-100 shadow-2xl animate-scale-in">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
                        ✓
                    </div>
                    <h2 className="text-2xl font-bold text-teal-900">¡Información Registrada Exitosamente!</h2>
                    <p className="text-sm text-slate-600">
                        Gracias <strong>{nombre}</strong>. Sus datos y documentos fueron recibidos correctamente por <strong>SST MedSys</strong>.
                    </p>
                    <p className="text-xs text-slate-500">
                        La Dra. Viviana Quiroz utilizará esta información para su examen médico ocupacional. Ya puede conectarse a la teleconsulta.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-white text-slate-900 flex flex-col items-center p-4 py-8">
            <div className="w-full max-w-xl">
                {/* Marca superior */}
                <div className="flex items-center justify-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg"
                        style={{ background: 'linear-gradient(135deg, var(--primary-400), var(--primary-700))' }}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21s-6.5-4.35-9-8.5C1.5 9.5 3.5 5.5 7 4.5c2.2-.6 4.5.2 5 1 .5-.8 2.8-1.6 5-1 3.5 1 5.5 5 4 8-2.5 4.15-9 8.5-9 8.5z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-teal-900 text-lg leading-tight">SST MedSys</p>
                        <p className="text-xs text-teal-600">Portal de Pre-Atención · Telemedicina Ocupacional</p>
                    </div>
                </div>

                <div className="bg-white border border-teal-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-700 to-cyan-700 p-6 text-white">
                        <h1 className="text-xl font-bold">Telemedicina Ocupacional</h1>
                        <p className="text-xs text-teal-100 mt-1">Dra. Viviana Quiroz — Portal de captura de identidad, firma y documentos para Teleconsulta Médica</p>
                    </div>

                    {/* Indicador de pasos */}
                    <div className="flex items-center justify-center gap-2 pt-5 px-6">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className={`flex items-center gap-2 ${n < 3 ? "flex-1" : ""}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                    paso >= n ? "bg-teal-600 text-white shadow-md" : "bg-slate-100 text-slate-400"
                                }`}>
                                    {paso > n ? "✓" : n}
                                </div>
                                {n < 3 && <div className={`flex-1 h-1 rounded-full ${paso > n ? "bg-teal-500" : "bg-slate-100"}`}></div>}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-6 pt-1 pb-3 px-6 text-[0.65rem] font-semibold">
                        <span className={paso >= 1 ? "text-teal-700" : "text-slate-400"}>Datos</span>
                        <span className={paso >= 2 ? "text-teal-700" : "text-slate-400"}>Identidad</span>
                        <span className={paso >= 3 ? "text-teal-700" : "text-slate-400"}>Firma y Docs</span>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* PASO 1: Datos Personales */}
                    {paso === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider">
                                Paso 1: Datos del Paciente
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        placeholder="Ej. María Fernanda Gómez"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Cédula / Documento *</label>
                                    <input
                                        type="text"
                                        required
                                        value={cedula}
                                        onChange={(e) => setCedula(e.target.value)}
                                        placeholder="Ej. 1085275155"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono Móvil (WhatsApp)</label>
                                    <input
                                        type="tel"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        placeholder="Ej. 3151234567"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={correo}
                                        onChange={(e) => setCorreo(e.target.value)}
                                        placeholder="paciente@ejemplo.com"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        value={fechaNacimiento}
                                        onChange={(e) => setFechaNacimiento(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Género</label>
                                    <select
                                        value={genero}
                                        onChange={(e) => setGenero(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-teal-500 outline-none text-sm transition-all"
                                    >
                                        <option value="Femenino">Femenino</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Empresa donde labora / ingresa</label>
                                    <input
                                        type="text"
                                        value={empresa}
                                        onChange={(e) => setEmpresa(e.target.value)}
                                        placeholder="Ej. Empresa XYZ SAS"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Cargo</label>
                                    <input
                                        type="text"
                                        value={cargo}
                                        onChange={(e) => setCargo(e.target.value)}
                                        placeholder="Ej. Operario de producción"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">EPS</label>
                                    <input
                                        type="text"
                                        value={eps}
                                        onChange={(e) => setEps(e.target.value)}
                                        placeholder="Ej. Nueva EPS, Sanitas..."
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">ARL</label>
                                    <input
                                        type="text"
                                        value={arl}
                                        onChange={(e) => setArl(e.target.value)}
                                        placeholder="Ej. Positiva, Sura..."
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Ciudad de Residencia</label>
                                    <input
                                        type="text"
                                        value={ciudad}
                                        onChange={(e) => setCiudad(e.target.value)}
                                        placeholder="Ej. Pasto, Nariño"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Dirección de Residencia</label>
                                    <input
                                        type="text"
                                        value={direccion}
                                        onChange={(e) => setDireccion(e.target.value)}
                                        placeholder="Ej. Calle 18 # 24-32"
                                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 items-start mt-4 bg-teal-50/60 p-4 rounded-xl border border-teal-100">
                                <input
                                    type="checkbox"
                                    id="consent"
                                    checked={consentimiento}
                                    onChange={(e) => setConsentimiento(e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded text-teal-600 bg-white border-slate-300 focus:ring-teal-500"
                                />
                                <label htmlFor="consent" className="text-[0.65rem] text-slate-600 leading-relaxed cursor-pointer">
                                    <strong>Consentimiento Informado para Telemedicina:</strong> Autorizo de manera voluntaria a la Dra. Viviana Quiroz para realizar mi evaluación médica ocupacional bajo la modalidad de Telemedicina. Acepto el tratamiento de mis datos personales, fotografías biométricas y firma, en cumplimiento de la Ley 1581 de 2012 y normatividad vigente del Ministerio de Salud.
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (nombre && cedula && consentimiento) setPaso(2);
                                    else if (!consentimiento) toast.error("Debe aceptar el consentimiento informado para telemedicina.");
                                    else toast.error("Ingrese su nombre y documento para continuar.");
                                }}
                                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-all mt-4 shadow-md shadow-teal-600/20"
                            >
                                Continuar a Documentos → 
                            </button>
                        </div>
                    )}

                    {/* PASO 2: Cédula y Selfie */}
                    {paso === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider">
                                Paso 2: Validación de Identidad
                            </h3>

                            {/* Foto Cédula */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-2">1. Foto legible de Cédula (Frontal) *</label>
                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50 overflow-hidden relative transition-colors">
                                    {cedulaFoto ? (
                                        <img src={cedulaFoto} alt="Cédula" className="h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-500 text-center p-2">📷 Toca para tomar o adjuntar foto de tu cédula</span>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, setCedulaFoto)} />
                                </label>
                            </div>

                            {/* Selfie Foto (Opcional) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-2">2. Foto Selfie (Opcional)</label>
                                {tomandoSelfie ? (
                                    <div className="space-y-2">
                                        <div className="h-48 bg-black rounded-xl overflow-hidden relative">
                                            <WebcamCapture ref={webcamRef} className="w-full h-full object-cover" onError={setSelfieError} onReady={() => setSelfieError(null)} />
                                        </div>
                                        {selfieError && (
                                            <p className="text-[0.65rem] text-red-600">{selfieError} También puede subirla desde la galería.</p>
                                        )}
                                        <button type="button" onClick={capturarSelfie} className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                                            📸 Capturar Foto
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50 overflow-hidden transition-colors">
                                            {selfieFoto ? (
                                                <img src={selfieFoto} alt="Selfie" className="h-full object-contain" />
                                            ) : (
                                                <span className="text-xs text-slate-500 text-center p-2">📁 Subir desde Galería</span>
                                            )}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setSelfieFoto)} />
                                        </label>
                                        <button type="button" onClick={() => setTomandoSelfie(true)} className="px-4 bg-white hover:bg-slate-50 border border-slate-300 text-xs text-teal-600 font-bold rounded-xl flex flex-col items-center justify-center">
                                            <span>📷</span>
                                            <span>Cam</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPaso(1)} className="w-1/3 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs">
                                    ← Atrás
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (cedulaFoto) setPaso(3);
                                        else toast.error("Suba la foto de su cédula para continuar.");
                                    }}
                                    className="w-2/3 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-teal-600/20"
                                >
                                    Siguiente: Firma y Exámenes →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Firma, Exámenes y Pago */}
                    {paso === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            <h3 className="text-sm font-bold text-teal-700 uppercase tracking-wider">
                                Paso 3: Firma y Documentos
                            </h3>

                            {/* Firma del trabajador */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">3. Firma del trabajador *</label>
                                <p className="text-[0.65rem] text-slate-500 mb-2">Firme con lapicero en un papel blanco y tómale una foto, o firme directamente en pantalla</p>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setModoFirmaPortal("foto")}
                                        className={`px-3 py-1.5 rounded-lg text-[0.65rem] font-bold ${modoFirmaPortal === "foto" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
                                    >
                                        📷 Foto de la firma
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModoFirmaPortal("pad")}
                                        className={`px-3 py-1.5 rounded-lg text-[0.65rem] font-bold ${modoFirmaPortal === "pad" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
                                    >
                                        ✍️ Firmar en pantalla
                                    </button>
                                </div>
                                {modoFirmaPortal === "pad" ? (
                                    <SignaturePad ref={firmaPadRef} />
                                ) : (
                                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50 overflow-hidden transition-colors">
                                        {firmaFoto ? (
                                            <img src={firmaFoto} alt="Firma" className="h-full object-contain" />
                                        ) : (
                                            <span className="text-xs text-slate-500 text-center p-2">✍️ Toca para tomar o subir foto de tu firma</span>
                                        )}
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, setFirmaFoto)} />
                                    </label>
                                )}
                            </div>

                            {/* Exámenes Previos (Opcional) */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">4. Exámenes Previos (Opcional)</label>
                                <p className="text-[0.65rem] text-slate-500 mb-2">Adjunte resultados de exámenes anteriores si tiene y desea compartirlos (imágenes o PDF)</p>
                                <div className="flex flex-wrap gap-2">
                                    {examenesFotos.map((img, i) => (
                                        <div key={i} className="relative">
                                            {img.startsWith("data:image") ? (
                                                <img src={img} alt={`Examen ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-500">
                                                    <span className="text-xl">📄</span>
                                                    <span className="text-[0.55rem]">PDF</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setExamenesFotos((prev) => prev.filter((_, idx) => idx !== i))}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-20 h-20 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-lg cursor-pointer bg-slate-50 flex items-center justify-center text-2xl text-slate-400 transition-colors">
                                        +
                                        <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleExamenesUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* Comprobante de Pago */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">5. Comprobante de Pago (Opcional / Si aplica)</label>
                                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl cursor-pointer bg-slate-50 overflow-hidden transition-colors">
                                    {comprobantePago ? (
                                        <img src={comprobantePago} alt="Pago" className="h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-500 text-center p-2">💳 Adjuntar comprobante Nequi / Daviplata / Banco</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setComprobantePago)} />
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPaso(2)} className="w-1/3 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs">
                                    ← Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 shadow-md shadow-emerald-600/20"
                                >
                                    {loading ? "Enviando Información..." : "✅ Enviar Documentos a la Dra."}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
                </div>
            </div>
        </div>
    );
}
