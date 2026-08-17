"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface BotonEnviarCorreoProps {
    evaluacionId: string;
    correoPaciente?: string | null;
    nombrePaciente?: string;
}

export default function BotonEnviarCorreo({ evaluacionId, correoPaciente, nombrePaciente }: BotonEnviarCorreoProps) {
    const [open, setOpen] = useState(false);
    const [correo, setCorreo] = useState(correoPaciente || "");
    const [enviando, setEnviando] = useState(false);

    const enviar = async () => {
        if (!correo.trim()) {
            toast.error("Ingrese el correo del destinatario.");
            return;
        }
        setEnviando(true);
        try {
            const res = await fetch("/api/enviar-certificado", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ evaluacion_id: evaluacionId, correo_destino: correo.trim() }),
            });

            let data: { error?: string; message?: string; id?: string } = {};
            try {
                data = await res.json();
            } catch {
                // Respuesta no JSON (p. ej. error 500 del servidor): construir mensaje genérico
                data = { error: res.ok ? undefined : `Error del servidor (HTTP ${res.status}). Intente de nuevo.` };
            }

            if (!res.ok) {
                const msg = data?.error || "Error al enviar el certificado.";
                // Si falta la configuración de Resend, dar instrucciones claras y cortas
                if (/RESEND_API_KEY/i.test(msg)) {
                    throw new Error(
                        "El envío de correos no está configurado (falta la llave de Resend). " +
                        "Agregue RESEND_API_KEY en el archivo .env.local (local) o en Vercel → Project → Settings → Environment Variables, y reinicie el servidor."
                    );
                }
                throw new Error(msg);
            }
            toast.success(data?.message || "Certificado enviado correctamente.");
            setOpen(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "No se pudo enviar el certificado. Revise la conexión e intente de nuevo.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            <button
                onClick={() => {
                    setCorreo(correoPaciente || "");
                    setOpen(true);
                }}
                className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg text-xs font-semibold transition-colors"
                title="Enviar certificado por correo al paciente"
            >
                📧 Enviar
            </button>

            {open && (
                <div className="modal-overlay" onClick={() => setOpen(false)}>
                    <div className="modal-content max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl">
                                📧
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Enviar Certificado</h3>
                                <p className="text-xs text-slate-500">
                                    El PDF del certificado y el enlace de verificación se enviarán por correo
                                    {nombrePaciente ? ` a ${nombrePaciente}` : ""}.
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="label-premium">Correo del destinatario</label>
                            <input
                                type="email"
                                className="input-premium"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                placeholder="paciente@correo.com"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
                            <button onClick={enviar} disabled={enviando} className="btn-primary">
                                {enviando ? "Enviando..." : "Enviar certificado"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
