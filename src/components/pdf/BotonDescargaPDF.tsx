"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CertificadoCMALAB } from "./CertificadoCMALAB";

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
            // Función HTTP estándar que ignora bloqueos internos de Supabase SDK
            const convertirURL_A_Base64 = async (url: string | null, isFirma: boolean = false) => {
                if (!url) return null;
                
                // Si ya es un Base64 válido, devolverlo inmediatamente sin hacer nada más
                if (url.startsWith("data:image")) {
                    return url;
                }
                
                // Si la URL es solo un nombre de archivo (por un error previo), reconstruir la URL pública de Supabase
                let fullUrl = url;
                if (!url.startsWith("http")) {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qosttaogcnoioytdjuyi.supabase.co";
                    const bucket = isFirma ? "firmas_biometricas" : "biometria_pacientes";
                    fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${url}`;
                }

                try {
                    const res = await fetch(fullUrl);
                    if (!res.ok) {
                        console.warn(`Imagen inaccesible (${res.status}): ${fullUrl}`);
                        return null;
                    }
                    const blob = await res.blob();

                    // FILTRO DE SEGURIDAD: Evita inyectar JSONs de error al PDF
                    if (!blob.type.startsWith('image/')) {
                        console.warn("El archivo descargado no es una imagen válida.");
                        return null;
                    }

                    return await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Error convirtiendo imagen:", e);
                    return null;
                }
            };

            const fotoB64 = await convertirURL_A_Base64(datosEvaluacion.paciente?.foto_url, false);
            const firmaB64 = await convertirURL_A_Base64(datosEvaluacion.firma_paciente_url, true);

            setDatosProcesados({
                ...datosEvaluacion,
                paciente: { ...datosEvaluacion.paciente, foto_url: fotoB64 },
                firma_paciente_url: firmaB64
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
            {/* @ts-ignore */}
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