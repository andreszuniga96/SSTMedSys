import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarPdfCertificado } from "@/lib/generar-certificado-pdf";
import type { DatosCertificadoInput } from "@/lib/certificado-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /ver-examen/[id]/pdf
 * Pública (accesible escaneando el QR del certificado, sin login).
 * Genera el certificado CMALAB en PDF y lo sirve inline para que el
 * paciente pueda verlo en línea (estilo factura electrónica) y descargarlo.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return NextResponse.json({ error: "Código de verificación no válido" }, { status: 400 });
        }

        const supabase = await createClient();

        // La RPC pública (SECURITY DEFINER, grant a anon) expone solo el examen solicitado
        const { data, error } = await supabase.rpc("obtener_examen_publico", {
            p_evaluacion_id: id,
        });

        if (error) {
            console.error("Error consultando examen público:", error);
            return NextResponse.json({ error: "No fue posible consultar el examen" }, { status: 500 });
        }

        const evaluacion = data?.evaluacion;
        const certificado = data?.certificado;
        const paciente = data?.paciente;

        if (!evaluacion || !paciente) {
            return NextResponse.json(
                { error: "El código de verificación no existe o el examen ya no está disponible." },
                { status: 404 }
            );
        }

        // Si aún no tiene certificado emitido, no se puede generar el PDF
        if (!certificado) {
            return NextResponse.json(
                { error: "Este examen aún no tiene certificado emitido." },
                { status: 404 }
            );
        }

        const input: DatosCertificadoInput = {
            evaluacion,
            certificado,
            paciente,
            contexto: data?.contexto || {},
            osteomuscular: data?.osteomuscular || {},
            historia: data?.historia || {},
        };

        const { buffer, nombreArchivo } = await generarPdfCertificado(input);

        // inline = el navegador lo muestra en línea; el paciente también puede descargarlo
        return new Response(new Uint8Array(buffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${nombreArchivo}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch (err: any) {
        console.error("Error generando certificado en línea:", err);
        return NextResponse.json(
            { error: "No fue posible generar el certificado. Intente de nuevo." },
            { status: 500 }
        );
    }
}
