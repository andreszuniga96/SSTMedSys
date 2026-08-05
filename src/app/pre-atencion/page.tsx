"use client";

import { useState, useRef } from "react";
import Webcam from "react-webcam";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function PortalPreAtencion() {
    const supabase = createClient();
    const webcamRef = useRef<Webcam>(null);

    const [paso, setPaso] = useState(1);
    const [loading, setLoading] = useState(false);
    const [completado, setCompletado] = useState(false);

    // Form state
    const [nombre, setNombre] = useState("");
    const [cedula, setCedula] = useState("");
    const [telefono, setTelefono] = useState("");
    const [empresa, setEmpresa] = useState("");
    const [consentimiento, setConsentimiento] = useState(false);

    // Images state
    const [cedulaFoto, setCedulaFoto] = useState<string | null>(null);
    const [selfieFoto, setSelfieFoto] = useState<string | null>(null);
    const [firmaFoto, setFirmaFoto] = useState<string | null>(null);
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

    const capturarSelfie = () => {
        const src = webcamRef.current?.getScreenshot();
        if (src) {
            setSelfieFoto(src);
            setTomandoSelfie(false);
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

    const subirImagen = async (base64: string, prefijo: string) => {
        const blob = base64ToBlob(base64);
        const file = new File([blob], `${prefijo}_${Date.now()}.jpg`, { type: "image/jpeg" });
        const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024 });
        const path = `${cedula}_${prefijo}_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from("biometria_pacientes").upload(path, compressed);
        if (error) throw error;
        return data.path;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !cedula) return toast.error("Por favor complete su nombre y número de cédula.");
        if (!cedulaFoto || !selfieFoto || !firmaFoto) return toast.error("Por favor adjunte la foto de su cédula, su selfie y la foto de su firma.");

        setLoading(true);
        try {
            // Upload images
            const cedulaUrl = await subirImagen(cedulaFoto, "cedula");
            const selfieUrl = await subirImagen(selfieFoto, "selfie");
            const firmaUrl = await subirImagen(firmaFoto, "firma");
            let pagoUrl = null;
            if (comprobantePago) {
                pagoUrl = await subirImagen(comprobantePago, "pago");
            }

            // Save record
            const { error } = await supabase.from("solicitudes_preatencion").insert({
                paciente_nombre: nombre,
                paciente_cedula: cedula,
                paciente_telefono: telefono,
                cedula_foto_url: cedulaUrl,
                selfie_foto_url: selfieUrl,
                firma_foto_url: firmaUrl,
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
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
                <div className="max-w-md w-full text-center space-y-4 bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl animate-scale-in">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
                        ✓
                    </div>
                    <h2 className="text-2xl font-bold">¡Información Registrada Exitosamente!</h2>
                    <p className="text-sm text-slate-300">
                        Gracias <strong>{nombre}</strong>. Sus datos biológicos y consentimiento fueron recibidos correctamente por <strong>SST MedSys</strong>.
                    </p>
                    <p className="text-xs text-slate-400">
                        La Dra. Viviana Quiroz utilizará esta información para su examen médico ocupacional. Ya puede conectarse a la teleconsulta.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white text-center">
                    <h1 className="text-xl font-bold">Telemedicina Ocupacional</h1>
                    <p className="text-xs text-blue-200 mt-1">Dra. Viviana Quiroz — Portal de captura de identidad y consentimiento para Teleconsulta Médica</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* PASO 1: Datos Personales */}
                    {paso === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                                Paso 1: Datos del Paciente
                            </h3>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    placeholder="Ej. María Fernanda Gómez"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Número de Cédula / Documento *</label>
                                <input
                                    type="text"
                                    required
                                    value={cedula}
                                    onChange={(e) => setCedula(e.target.value)}
                                    placeholder="Ej. 1085275155"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Teléfono Móvil (WhatsApp)</label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    placeholder="Ej. 3151234567"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Empresa a la que ingresa o labora</label>
                                <input
                                    type="text"
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value)}
                                    placeholder="Ej. Empresa XYZ SAS"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex gap-3 items-start mt-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <input 
                                    type="checkbox" 
                                    id="consent"
                                    checked={consentimiento}
                                    onChange={(e) => setConsentimiento(e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500" 
                                />
                                <label htmlFor="consent" className="text-[0.65rem] text-slate-300 leading-relaxed cursor-pointer">
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
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all mt-4"
                            >
                                Continuar a Validación Geométrica →
                            </button>
                        </div>
                    )}

                    {/* PASO 2: Fotos de Cédula y Selfie */}
                    {paso === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                                Paso 2: Validación de Identidad
                            </h3>

                            {/* Foto Cédula */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-2">1. Foto legible de Cédula (Frontal) *</label>
                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-800/50 overflow-hidden relative">
                                    {cedulaFoto ? (
                                        <img src={cedulaFoto} alt="Cédula" className="h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400 text-center p-2">📷 Toca para tomar o adjuntar foto de tu cédula</span>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, setCedulaFoto)} />
                                </label>
                            </div>

                            {/* Selfie Foto */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-2">2. Foto Selfie en Tiempo Real *</label>
                                {tomandoSelfie ? (
                                    <div className="space-y-2">
                                        <div className="h-48 bg-black rounded-xl overflow-hidden relative">
                                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                                        </div>
                                        <button type="button" onClick={capturarSelfie} className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                                            📸 Capturar Foto
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-800/50 overflow-hidden">
                                            {selfieFoto ? (
                                                <img src={selfieFoto} alt="Selfie" className="h-full object-contain" />
                                            ) : (
                                                <span className="text-xs text-slate-400 text-center p-2">📁 Subir desde Galería</span>
                                            )}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setSelfieFoto)} />
                                        </label>
                                        <button type="button" onClick={() => setTomandoSelfie(true)} className="px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-blue-400 font-bold rounded-xl flex flex-col items-center justify-center">
                                            <span>📷</span>
                                            <span>Cam</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPaso(1)} className="w-1/3 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs">
                                    ← Atrás
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (cedulaFoto && selfieFoto) setPaso(3);
                                        else toast.error("Suba la foto de su cédula y su selfie.");
                                    }}
                                    className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs"
                                >
                                    Siguiente: Firma y Pago →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: Firma en Papel y Pago */}
                    {paso === 3 && (
                        <div className="space-y-5 animate-fade-in">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                                Paso 3: Firma y Comprobante
                            </h3>

                            {/* Foto Firma */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">3. Foto de Firma manuscrita en papel blanco *</label>
                                <p className="text-[0.65rem] text-slate-400 mb-2">Firme con lapicero negro/azul en un papel blanco y tómale una foto clara</p>
                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-800/50 overflow-hidden">
                                    {firmaFoto ? (
                                        <img src={firmaFoto} alt="Firma" className="h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400 text-center p-2">✍️ Toca para tomar o subir foto de tu firma</span>
                                    )}
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e, setFirmaFoto)} />
                                </label>
                            </div>

                            {/* Comprobante de Pago */}
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">4. Comprobante de Pago (Opcional / Si aplica)</label>
                                <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-800/50 overflow-hidden">
                                    {comprobantePago ? (
                                        <img src={comprobantePago} alt="Pago" className="h-full object-contain" />
                                    ) : (
                                        <span className="text-xs text-slate-400 text-center p-2">💳 Adjuntar comprobante Nequi / Daviplata / Banco</span>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setComprobantePago)} />
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPaso(2)} className="w-1/3 py-3 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs">
                                    ← Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                                >
                                    {loading ? "Enviando Información..." : "✅ Enviar Documentos a la Dra."}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
