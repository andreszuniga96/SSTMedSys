/**
 * Generación server-side del PDF del certificado CMALAB.
 * Se comparte entre:
 *  - /api/enviar-certificado (envío automático por correo)
 *  - /ver-examen/[id]/pdf      (consulta pública del certificado en línea)
 */
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificadoCMALAB } from "@/components/pdf/CertificadoCMALAB";
import {
    construirDatosCertificado,
    generarQR,
    urlABase64,
    type DatosCertificadoInput,
} from "@/lib/certificado-data";
import { PUBLIC_APP_URL } from "@/lib/config";

export interface PdfGenerado {
    buffer: Buffer;
    nombreArchivo: string;
}

/**
 * Construye los datos, convierte las imágenes a Base64, genera el QR
 * y renderiza el PDF del certificado. Devuelve el buffer listo para
 * enviar (correo) o servir (respuesta HTTP).
 */
export async function generarPdfCertificado(
    input: DatosCertificadoInput
): Promise<PdfGenerado> {
    const datos = construirDatosCertificado(input);

    // Sello y firma de la doctora: URLs absolutas de producción para el render server-side
    datos.img_doctor_seal = `${PUBLIC_APP_URL}/sellodra.png`;
    datos.img_doctor_sig = `${PUBLIC_APP_URL}/firmadra.png`;

    // Convertir imágenes remotas a Base64 (el render server-side no carga rutas relativas)
    const [fotoB64, firmaB64, selloB64, firmaDraB64, qrDataUrl] = await Promise.all([
        urlABase64(input.paciente?.foto_url, "biometria_pacientes"),
        urlABase64(input.certificado?.firma_paciente_url, "firmas_biometricas"),
        urlABase64(datos.img_doctor_seal),
        urlABase64(datos.img_doctor_sig),
        generarQR(input.evaluacion.id),
    ]);

    datos.paciente = { ...datos.paciente, foto_url: fotoB64 };
    datos.firma_paciente_url = firmaB64;
    datos.img_doctor_seal = selloB64;
    datos.img_doctor_sig = firmaDraB64;
    datos.qr_url = qrDataUrl;

    const buffer = await renderToBuffer(<CertificadoCMALAB datos={datos} />);

    const nombreArchivo = `CMALAB_${(input.paciente?.documento_identidad || "paciente")
        .replace(/[^a-zA-Z0-9]/g, "")}.pdf`;

    return { buffer, nombreArchivo };
}
