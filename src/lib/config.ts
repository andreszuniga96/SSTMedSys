/**
 * Configuración central del sistema.
 * PUBLIC_APP_URL: dominio público donde está desplegado el sistema (Vercel).
 * Se usa para el enlace del portal pre-atención, el QR del certificado y
 * los correos de envío automático. Si no se define NEXT_PUBLIC_APP_URL,
 * se usa el dominio de producción por defecto.
 */
export const PUBLIC_APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://sst-med-sys.vercel.app";

export const PORTAL_PREATENCION_URL = `${PUBLIC_APP_URL}/pre-atencion`;

/**
 * URL base de Supabase (fallback del proyecto si falta NEXT_PUBLIC_SUPABASE_URL).
 * Centralizada aquí para evitar duplicar el valor en certificado-data.ts e
 * imagenes-cliente.ts.
 */
export const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qosttaogcnoioytdjuyi.supabase.co";
