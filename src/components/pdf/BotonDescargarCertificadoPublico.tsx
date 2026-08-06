"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { CertificadoCMALAB } from "@/components/pdf/CertificadoCMALAB";
import { construirDatosCertificado } from "@/lib/certificado-data";
import { PUBLIC_APP_URL } from "@/lib/config";

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => (
            <button disabled className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 font-semibold rounded-xl text-sm cursor-wait">
                Iniciando motor PDF...
            </button>
        ),
    }
);

/**
 * Botón de descarga del certificado para la página pública /ver-examen/[id].
 * Genera el PDF en el CLIENTE (funciona en celulares, incl. iOS donde el
 * visor embebido falla) con los datos ya cargados por la RPC pública.
 */
export default function BotonDescargarCertificado({
    examen,
    id,
    variante = "principal",
}: {
    examen: any;
    id: string;
    /** "principal" = teal sólido (secciones claras) · "header" = translúcido (header oscuro) */
    variante?: "principal" | "header";
}) {
    const [mounted, setMounted] = useState(false);
    const [datos, setDatos] = useState<any>(null);

    useEffect(() => {
        const preparar = async () => {
            // Conversión de imágenes a Base64 para el PDF (FileReader, compatible navegador)
            const convertirURL_A_Base64 = async (url: string | null | undefined, bucket?: string) => {
                if (!url) return null;
                if (url.startsWith("data:image")) return url;

                let fullUrl = url;
                if (!url.startsWith("http")) {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qosttaogcnoioytdjuyi.supabase.co";
                    if (bucket) {
                        fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${url}`;
                    } else if (url.startsWith("/")) {
                        fullUrl = `${PUBLIC_APP_URL}${url}`;
                    } else {
                        fullUrl = `${supabaseUrl}/storage/v1/object/public/${url}`;
                    }
                }

                try {
                    const res = await fetch(fullUrl);
                    if (!res.ok) return null;
                    const blob = await res.blob();
                    if (!blob.type.startsWith("image/")) return null;
                    return await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch {
                    return null;
                }
            };

            const [fotoB64, firmaB64] = await Promise.all([
                convertirURL_A_Base64(examen.paciente?.foto_url, "biometria_pacientes"),
                convertirURL_A_Base64(examen.certificado?.firma_paciente_url, "firmas_biometricas"),
            ]);

            // QR de verificación (apunta a esta misma página pública)
            let qrDataUrl: string | null = null;
            try {
                qrDataUrl = await QRCode.toDataURL(`${PUBLIC_APP_URL}/ver-examen/${id}`, {
                    margin: 1,
                    width: 320,
                    errorCorrectionLevel: "M",
                });
            } catch {
                qrDataUrl = null;
            }

            const datos = construirDatosCertificado({
                evaluacion: examen.evaluacion,
                certificado: examen.certificado,
                paciente: examen.paciente || {},
                contexto: examen.contexto || {},
                osteomuscular: examen.osteomuscular || {},
                historia: examen.historia || {},
            });

            datos.paciente = { ...datos.paciente, foto_url: fotoB64 };
            datos.firma_paciente_url = firmaB64;
            datos.qr_url = qrDataUrl;

            setDatos(datos);
            setMounted(true);
        };
        preparar();
    }, [examen, id]);

    if (!mounted || !datos) {
        return (
            <button disabled className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-100 font-semibold rounded-xl text-sm cursor-wait border border-teal-400/30">
                <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Preparando certificado...
            </button>
        );
    }

    const nombreArchivo = `CMALAB_${(examen.paciente?.documento_identidad || "certificado")
        .replace(/[^a-zA-Z0-9]/g, "")}.pdf`;

    return (
        <PDFDownloadLink
            document={<CertificadoCMALAB datos={datos} />}
            fileName={nombreArchivo}
            className={`inline-flex items-center gap-2 px-4 py-2 font-bold rounded-xl text-sm transition-all ${
                variante === "header"
                    ? "bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-white shadow"
                    : "bg-teal-600 hover:bg-teal-700 text-white shadow-md"
            }`}
        >
            {/* @ts-ignore */}
            {({ loading }) =>
                loading ? (
                    <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Generando PDF...
                    </span>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar Certificado
                    </>
                )
            }
        </PDFDownloadLink>
    );
}
