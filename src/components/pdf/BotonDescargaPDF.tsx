"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { CertificadoCMALAB } from "./CertificadoCMALAB";
import { PUBLIC_APP_URL } from "@/lib/config";
import { convertirImagenABase64 } from "@/lib/imagenes-cliente";

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => (
            <button disabled className="px-4 py-2 bg-slate-200 text-slate-500 rounded-lg text-sm flex items-center gap-2 cursor-wait">
                Iniciando motor PDF...
            </button>
        ),
    }
);

interface BotonDescargaProps {
    datosEvaluacion: any;
    nombreArchivo: string;
}

export default function BotonDescargaPDF({ datosEvaluacion, nombreArchivo }: BotonDescargaProps) {
    const [mounted, setMounted] = useState(false);
    const [datosProcesados, setDatosProcesados] = useState<any>(null);

    useEffect(() => {
        const prepararImagenes = async () => {
            const fotoB64 = await convertirImagenABase64(datosEvaluacion.paciente?.foto_url, { bucket: "biometria_pacientes" });
            const firmaB64 = await convertirImagenABase64(datosEvaluacion.firma_paciente_url, { bucket: "firmas_biometricas" });

            // Generar QR de verificación digital (enlace público del examen en PRODUCCIÓN)
            let qrDataUrl: string | null = null;
            try {
                if (datosEvaluacion.evaluacion_id) {
                    const qrUrl = `${PUBLIC_APP_URL}/ver-examen/${datosEvaluacion.evaluacion_id}`;
                    qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 320, errorCorrectionLevel: "M" });
                }
            } catch (qrErr) {
                console.error("Error generando código QR:", qrErr);
            }

            setDatosProcesados({
                ...datosEvaluacion,
                paciente: { ...datosEvaluacion.paciente, foto_url: fotoB64 },
                firma_paciente_url: firmaB64,
                qr_url: qrDataUrl,
                url_verificacion: datosEvaluacion.evaluacion_id ? `${PUBLIC_APP_URL}/ver-examen/${datosEvaluacion.evaluacion_id}` : null,
            });
            setMounted(true);
        };

        prepararImagenes();
    }, [datosEvaluacion]);

    if (!mounted || !datosProcesados) {
        return (
            <button disabled className="px-4 py-2 bg-blue-50 text-blue-400 font-semibold rounded-lg text-sm flex items-center gap-2 cursor-wait">
                Procesando biométricos...
            </button>
        );
    }

    return (
        <PDFDownloadLink
            document={<CertificadoCMALAB datos={datosProcesados} />}
            fileName={`${nombreArchivo}.pdf`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
            {({ loading }) =>
                loading ? (
                    "Renderizando PDF..."
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Descargar Certificado
                    </>
                )
            }
        </PDFDownloadLink>
    );
}