/**
 * Conversión de imágenes a Base64 para el render del PDF en el CLIENTE.
 * Compatible con navegador (FileReader) — no usa Node APIs.
 *
 * Se usa tanto en el dashboard (BotonDescargaPDF) como en la página
 * pública del QR (BotonDescargarCertificadoPublico) para eliminar
 * la duplicación de la lógica de reconstrucción de URLs.
 */
import { PUBLIC_APP_URL, SUPABASE_URL } from "@/lib/config";

export interface OpcionesImagen {
    /** Bucket público de Supabase Storage si la URL es relativa de storage */
    bucket?: string;
}

/**
 * Convierte una URL de imagen a data-URL Base64 para el PDF.
 * - Si ya es `data:image...`, la devuelve tal cual.
 * - Si es relativa de storage de Supabase, reconstruye la URL pública con el bucket.
 * - Si es una ruta local de la app (ej. "/sellodra.png"), usa PUBLIC_APP_URL.
 * - Devuelve null si la imagen no existe o no es una imagen (filtro de seguridad
 *   que evita inyectar JSONs de error al PDF).
 */
export const convertirImagenABase64 = async (
    url: string | null | undefined,
    opciones?: OpcionesImagen
): Promise<string | null> => {
    if (!url) return null;

    // Ya es un Base64 válido — devolverlo directamente
    if (url.startsWith("data:image")) return url;

    // Reconstruir URLs relativas (storage de Supabase o rutas locales de la app)
    let fullUrl = url;
    if (!url.startsWith("http")) {
        const supabaseUrl = SUPABASE_URL;
        if (opciones?.bucket) {
            fullUrl = `${supabaseUrl}/storage/v1/object/public/${opciones.bucket}/${url}`;
        } else if (url.startsWith("/")) {
            fullUrl = `${PUBLIC_APP_URL}${url}`;
        } else {
            fullUrl = `${supabaseUrl}/storage/v1/object/public/${url}`;
        }
    }

    try {
        const res = await fetch(fullUrl);
        if (!res.ok) {
            console.warn(`Imagen inaccesible (${res.status}): ${fullUrl}`);
            return null;
        }
        const blob = await res.blob();

        // FILTRO DE SEGURIDAD: evita inyectar JSONs de error al PDF
        if (!blob.type.startsWith("image/")) {
            console.warn("El archivo descargado no es una imagen válida.");
            return null;
        }

        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string | null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Error convirtiendo imagen a Base64:", e);
        return null;
    }
};
