"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface BotonEnviarWhatsAppProps {
    evaluacionId: string;
    telefonoPaciente?: string | null;
    nombrePaciente?: string;
}

// Limpia el número de teléfono dejando solo dígitos y añade el indicativo de Colombia (+57) si no tiene uno
function normalizarTelefono(tel: string): string {
    const soloDigitos = tel.replace(/\D/g, "");
    // Si ya empieza con código internacional (10+ dígitos, típicamente 12 para Colombia)
    if (soloDigitos.length >= 11) return soloDigitos;
    // Número colombiano de 10 dígitos (empieza con 3xx)
    if (soloDigitos.length === 10 && soloDigitos.startsWith("3")) return `57${soloDigitos}`;
    // Número de 7 dígitos (fijo sin área) o cualquier otro: devolver tal cual
    return soloDigitos;
}

const URL_BASE_PUBLICA = process.env.NEXT_PUBLIC_SITE_URL || "https://sst-med-sys.vercel.app";

export default function BotonEnviarWhatsApp({ evaluacionId, telefonoPaciente, nombrePaciente }: BotonEnviarWhatsAppProps) {
    const [open, setOpen] = useState(false);
    const [telefono, setTelefono] = useState(telefonoPaciente || "");

    const urlCertificado = `${URL_BASE_PUBLICA}/ver-examen/${evaluacionId}`;

    const mensaje = `Hola${nombrePaciente ? ` ${nombrePaciente}` : ""}! 👋

Le compartimos su *Certificado de Aptitud Laboral* generado por SSTMedSys.

📋 *Puede consultarlo en el siguiente enlace:*
${urlCertificado}

Este certificado tiene código QR de verificación para confirmar su autenticidad. 

_Servicio médico ocupacional — SSTMedSys_`;

    const abrirWhatsApp = () => {
        const tel = telefono.trim();
        if (!tel) {
            toast.error("Ingrese el número de WhatsApp del paciente.");
            return;
        }

        const telNormalizado = normalizarTelefono(tel);
        if (telNormalizado.length < 7) {
            toast.error("El número ingresado no parece válido. Verifique e intente de nuevo.");
            return;
        }

        const url = `https://wa.me/${telNormalizado}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
        toast.success("WhatsApp abierto. Revise la ventana o app para enviar el mensaje.");
    };

    return (
        <>
            <button
                onClick={() => {
                    setTelefono(telefonoPaciente || "");
                    setOpen(true);
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                title="Enviar certificado por WhatsApp al paciente"
            >
                {/* WhatsApp SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar
            </button>

            {open && (
                <div className="modal-overlay" onClick={() => setOpen(false)}>
                    <div className="modal-content max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Enviar por WhatsApp</h3>
                                <p className="text-xs text-slate-500">
                                    Se abrirá WhatsApp con el enlace del certificado listo para enviar
                                    {nombrePaciente ? ` a ${nombrePaciente}` : ""}.
                                </p>
                            </div>
                        </div>

                        {/* Preview del mensaje */}
                        <div className="rounded-xl bg-[#DCF8C6] border border-green-200 p-3 text-xs text-slate-800 font-mono leading-relaxed whitespace-pre-wrap shadow-sm">
                            {mensaje}
                        </div>

                        {/* Input número */}
                        <div>
                            <label className="label-premium">Número de WhatsApp del paciente</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">🇨🇴 +57</span>
                                <input
                                    type="tel"
                                    className="input-premium pl-16"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    placeholder="3XX XXX XXXX"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[0.65rem] text-slate-400 mt-1">
                                Ingrese el número con o sin código de país. Ej: 3001234567 ó +573001234567
                            </p>
                        </div>

                        {/* Link directo */}
                        <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="text-xs font-semibold text-slate-500">🔗 Enlace:</span>
                            <span className="text-xs text-teal-700 truncate flex-1 font-mono">{urlCertificado}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(urlCertificado);
                                    toast.success("Enlace copiado al portapapeles");
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0"
                            >
                                Copiar
                            </button>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-1">
                            <button onClick={() => setOpen(false)} className="btn-secondary">
                                Cancelar
                            </button>
                            <button
                                onClick={abrirWhatsApp}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95"
                                style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
                            >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Abrir WhatsApp y enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
