import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificadoCMALAB } from "@/components/pdf/CertificadoCMALAB";
import {
    construirDatosCertificado,
    generarQR,
    urlABase64,
    type DatosCertificadoInput,
} from "@/lib/certificado-data";
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

        // 2. Construir datos del certificado (con imágenes en Base64 y QR)
        const input: DatosCertificadoInput = {
            evaluacion,
            certificado,
            paciente,
            contexto: contexto || {},
            osteomuscular: osteomuscular || {},
            historia: historia || {},
        };

        const datos = construirDatosCertificado(input);

        // Sello y firma de la doctora: usar URLs absolutas de producción para el render server-side
        datos.img_doctor_seal = `${PUBLIC_APP_URL}/sellodra.png`;
        datos.img_doctor_sig = `${PUBLIC_APP_URL}/firmadra.png`;

        // Convertir imágenes remotas a Base64 para el render server-side
        // (las rutas relativas de storage se resuelven con su bucket correspondiente)
        const [fotoB64, firmaB64, selloB64, firmaDraB64, qrDataUrl] = await Promise.all([
            urlABase64(paciente.foto_url, "biometria_pacientes"),
            urlABase64(certificado.firma_paciente_url, "firmas_biometricas"),
            urlABase64(datos.img_doctor_seal),
            urlABase64(datos.img_doctor_sig),
            generarQR(evaluacionId),
        ]);

        datos.paciente = { ...datos.paciente, foto_url: fotoB64 };
        datos.firma_paciente_url = firmaB64;
        datos.img_doctor_seal = selloB64;
        datos.img_doctor_sig = firmaDraB64;
        datos.qr_url = qrDataUrl;

        // 3. Renderizar el PDF
        let pdfBuffer: Buffer;
        try {
            pdfBuffer = await renderToBuffer(<CertificadoCMALAB datos={datos} />);
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
                        "El envío de correos no está configurado. Agregue la variable RESEND_API_KEY en Vercel (https://resend.com) para habilitar el envío automático del certificado.",
                },
                { status: 503 }
            );
        }

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

        const nombreArchivo = `CMALAB_${(paciente.documento_identidad || "paciente").replace(/[^a-zA-Z0-9]/g, "")}.pdf`;

        const resendRes = await fetch("https://api.resend.com/emails", {
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
                        filename: nombreArchivo,
                        content: pdfBuffer.toString("base64"),
                    },
                ],
            }),
        });

        const resendBody = await resendRes.json().catch(() => ({}));

        if (!resendRes.ok) {
            console.error("Error enviando correo (Resend):", resendBody);
            return NextResponse.json(
                { error: `No fue posible enviar el correo: ${resendBody?.message || "error desconocido"}` },
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
