import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarPdfCertificado } from "@/lib/generar-certificado-pdf";
import type { DatosCertificadoInput } from "@/lib/certificado-data";
import { PUBLIC_APP_URL } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/enviar-certificado
 * Envía automáticamente el certificado CMALAB (PDF adjunto + enlace de
 * verificación) al correo del paciente.
 *
 * Body: { evaluacion_id: string, correo_destino?: string }
 *   - Si no se envía correo_destino, usa el correo registrado del paciente.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // Solo usuarios autenticados del sistema pueden disparar el envío
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const evaluacionId = body?.evaluacion_id as string | undefined;
        const correoDestino = (body?.correo_destino as string | undefined)?.trim();

        if (!evaluacionId) {
            return NextResponse.json({ error: "Falta el id de la evaluación" }, { status: 400 });
        }

        // 1. Cargar todos los datos relacionados
        const { data: evaluacion } = await supabase
            .from("evaluaciones")
            .select("*")
            .eq("id", evaluacionId)
            .single();

        if (!evaluacion) {
            return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
        }

        const { data: certificado } = await supabase
            .from("certificados_aptitud")
            .select("*")
            .eq("evaluacion_id", evaluacionId)
            .single();

        const { data: paciente } = await supabase
            .from("pacientes")
            .select("*")
            .eq("id", evaluacion.paciente_id)
            .single();

        const { data: contexto } = await supabase
            .from("contexto_laboral")
            .select("*")
            .eq("paciente_id", evaluacion.paciente_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        const { data: osteomuscular } = await supabase
            .from("valoracion_osteomuscular")
            .select("*")
            .eq("evaluacion_id", evaluacionId)
            .maybeSingle();

        const { data: historia } = await supabase
            .from("historia_clinica")
            .select("*")
            .eq("evaluacion_id", evaluacionId)
            .maybeSingle();

        if (!paciente) {
            return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
        }

        if (!certificado) {
            return NextResponse.json(
                { error: "La evaluación aún no tiene certificado emitido. Genere el certificado antes de enviarlo." },
                { status: 400 }
            );
        }

        const email = correoDestino || paciente.correo_electronico;
        if (!email) {
            return NextResponse.json(
                { error: "El paciente no tiene correo electrónico registrado. Registre uno para poder enviar el certificado." },
                { status: 400 }
            );
        }

        // 2. Renderizar el PDF del certificado (helper compartido con el visor público)
        const input: DatosCertificadoInput = {
            evaluacion,
            certificado,
            paciente,
            contexto: contexto || {},
            osteomuscular: osteomuscular || {},
            historia: historia || {},
        };

        let pdfBuffer: Buffer;
        let nombreArchivo: string;
        try {
            const pdf = await generarPdfCertificado(input);
            pdfBuffer = pdf.buffer;
            nombreArchivo = pdf.nombreArchivo;
        } catch (pdfErr) {
            console.error("Error renderizando PDF:", pdfErr);
            return NextResponse.json(
                { error: "No fue posible generar el PDF del certificado. Intente de nuevo." },
                { status: 500 }
            );
        }

        // 4. Enviar por correo (Resend)
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    error:
                        "El envío de correos no está configurado: falta RESEND_API_KEY. En Vercel (Project → Settings → Environment Variables) agregue RESEND_API_KEY con una API Key de https://resend.com/api-keys y, si lo desea, EMAIL_FROM (p. ej. \"SST MedSys <no-responder@tudominio.com>\"). Luego redepliegue.",
                },
                { status: 503 }
            );
        }

        // Nota: el dominio por defecto onboarding@resend.dev solo permite enviar a la
        // propia cuenta verificada de Resend; para enviar a los pacientes configure un
        // dominio propio en Resend (Settings → Domains) y úselo en EMAIL_FROM.
        const from = process.env.EMAIL_FROM || "SST MedSys <onboarding@resend.dev>";
        const nombrePaciente = paciente.nombre_completo || "Paciente";
        const linkVerificacion = `${PUBLIC_APP_URL}/ver-examen/${evaluacionId}`;
        const concepto = certificado.concepto_medico || "Emitido";
        const fecha = new Date(evaluacion.fecha_actual || new Date()).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#f0fdfa;border-radius:16px;overflow:hidden;border:1px solid #ccfbf1">
          <div style="background:linear-gradient(135deg,#0e7490,#0891b2);padding:28px 32px;color:#fff">
            <h1 style="margin:0;font-size:22px">SST MedSys — Certificado Médico Ocupacional</h1>
            <p style="margin:6px 0 0;opacity:.9;font-size:13px">Concepto Médico de Aptitud Laboral (CMALAB)</p>
          </div>
          <div style="padding:28px 32px;color:#134e4a">
            <p style="font-size:15px">Hola <strong>${nombrePaciente}</strong>,</p>
            <p style="font-size:14px;line-height:1.6">
              Le compartimos su <strong>examen médico ocupacional</strong> realizado el <strong>${fecha}</strong>.
              Su concepto médico es: <strong style="color:#0e7490">${concepto}</strong>.
            </p>
            <p style="font-size:14px;line-height:1.6">
              En el archivo adjunto encuentra su certificado en PDF. También puede consultarlo
              en línea en cualquier momento escaneando el código QR del certificado o desde este enlace:
            </p>
            <p style="text-align:center;margin:22px 0">
              <a href="${linkVerificacion}" style="display:inline-block;background:#0891b2;color:#fff;text-decoration:none;padding:12px 26px;border-radius:10px;font-weight:bold;font-size:14px">
                Ver mi examen médico en línea
              </a>
            </p>
            <p style="font-size:12px;color:#155e75;border-top:1px solid #ccfbf1;padding-top:14px;margin-top:8px">
              Documento emitido por la Dra. Viviana Quiroz R. · Médico General, Especialista en Salud Ocupacional.
              Resolución 2346/2007 · Decreto 1072/2015 · Ley 1581/2012.
            </p>
          </div>
        </div>
        `;

        const nombreArchivoAdjunto = nombreArchivo || `CMALAB_${(paciente.documento_identidad || "paciente").replace(/[^a-zA-Z0-9]/g, "")}.pdf`;

        let resendRes: Response;
        try {
            resendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from,
                    to: [email],
                    subject: `Su certificado médico ocupacional — ${concepto}`,
                    html,
                    attachments: [
                        {
                            filename: nombreArchivoAdjunto,
                            content: pdfBuffer.toString("base64"),
                        },
                    ],
                }),
                signal: AbortSignal.timeout(20000),
            });
        } catch (netErr) {
            console.error("Error de red llamando a Resend:", netErr);
            return NextResponse.json(
                {
                    error:
                        "No se pudo contactar el servicio de correo (Resend). Revise la conexión a internet e intente de nuevo.",
                },
                { status: 502 }
            );
        }

        const resendBody = await resendRes.json().catch(() => ({}));

        if (!resendRes.ok) {
            console.error("Error enviando correo (Resend):", resendBody);
            const msg: string = resendBody?.message || "error desconocido";
            // Error típico cuando EMAIL_FROM usa un dominio aún no verificado en Resend
            if (/domain|from address|sender|not verified/i.test(msg) || resendBody?.statusCode === 403) {
                return NextResponse.json(
                    {
                        error: `No fue posible enviar el correo: ${msg}. Verifique que el dominio de EMAIL_FROM esté verificado en Resend (Settings → Domains) y que el remitente use ese dominio.`,
                    },
                    { status: 502 }
                );
            }
            return NextResponse.json(
                { error: `No fue posible enviar el correo: ${msg}` },
                { status: 502 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: `Certificado enviado a ${email}`,
            id: resendBody?.id,
        });
    } catch (err: any) {
        console.error("Error en /api/enviar-certificado:", err);
        return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
    }
}
