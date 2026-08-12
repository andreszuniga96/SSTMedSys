"use client";

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Webcam from "react-webcam";

export interface WebcamCaptureRef {
    capture: () => string | null;
}

interface WebcamCaptureProps {
    className?: string;
    /** Callback cuando la cámara no está disponible (permiso denegado, sin dispositivo, etc.) */
    onError?: (mensaje: string) => void;
    /** Callback cuando la cámara arranca con éxito (útil para limpiar mensajes de error previos) */
    onReady?: () => void;
    /** Mostrar selector cuando hay varias cámaras conectadas (por defecto true) */
    selectorCamaras?: boolean;
}

/** Altura mínima que consideramos "suficiente" para no buscar una cámara mejor (900p < 1080p). */
const ALTURA_MINIMA_PREFERIDA = 900;

/**
 * Traduce un error de getUserMedia a un mensaje claro y accionable.
 * Los nombres siguen la especificación de MediaDevices:
 * - NotAllowedError: permiso denegado/bloqueado
 * - NotFoundError: no hay dispositivo de video
 * - NotReadableError: dispositivo ocupado por otra app/pestaña (Windows solo permite un usuario)
 * - OverconstrainedError: la cámara no soporta la resolución solicitada
 */
function mensajeErrorCamara(err: unknown): string {
    const nombre = (err as DOMException)?.name || (err as Error)?.name || "";
    switch (nombre) {
        case "NotAllowedError":
        case "PermissionDeniedError":
        case "SecurityError":
            return "El permiso de la cámara está bloqueado. Haga clic en el icono 🔒 de la barra de direcciones, permita el acceso a la cámara y pulse Reintentar.";
        case "NotFoundError":
        case "DevicesNotFoundError":
            return "No se encontró ninguna cámara conectada. Conecte su webcam y pulse Reintentar.";
        case "NotReadableError":
        case "TrackStartError":
        case "AbortError":
            return "La cámara está siendo usada por otra aplicación o pestaña. Ciérrela e intente de nuevo.";
        default:
            return "No se pudo iniciar la cámara. Verifique que el permiso no esté bloqueado y que la webcam esté conectada, luego pulse Reintentar.";
    }
}

const WebcamCapture = forwardRef<WebcamCaptureRef, WebcamCaptureProps>(
    ({ className, onError, onReady, selectorCamaras = true }, ref) => {
        const webcamRef = useRef<Webcam>(null);
        const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
        const [deviceId, setDeviceId] = useState<string | null>(null);
        const [error, setError] = useState<string | null>(null);
        const [intento, setIntento] = useState(0);
        const eleccionManualRef = useRef(false);
        const autoSeleccionadaRef = useRef(false);

        const marcarError = useCallback(
            (mensaje: string) => {
                setError(mensaje);
                onError?.(mensaje);
            },
            [onError]
        );

        /**
         * Actualiza SOLO la lista del selector de cámaras.
         * Nunca bloquea la cámara ni muestra error: antes de otorgar permiso,
         * enumerateDevices() puede devolver 0 dispositivos (Firefox y algunos
         * navegadores) y eso NO debe impedir intentar abrir la cámara — solo
         * getUserMedia dispara el prompt de permiso del navegador.
         */
        const listarCamaras = useCallback(() => {
            if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
            navigator.mediaDevices
                .enumerateDevices()
                .then((dispositivos) => {
                    setCamaras(dispositivos.filter((d) => d.kind === "videoinput"));
                })
                .catch(() => {
                    /* sin consecuencias: el selector se llenará cuando la cámara arranque */
                });
        }, []);

        useEffect(() => {
            listarCamaras();
        }, [listarCamaras]);

        /**
         * Elige automáticamente la mejor cámara (la de mayor resolución) cuando hay varias.
         * El navegador por defecto suele quedarse con la integrada del portátil (a 720p),
         * ignorando una webcam externa 1080p; aquí probamos cada cámara y nos quedamos
         * con la que entregue la resolución más alta. Solo se ejecuta tras otorgar el
         * permiso (primera vez que el stream arranca) y si el usuario no eligió manualmente.
         */
        const elegirMejorCamara = useCallback(async () => {
            if (eleccionManualRef.current) return;
            eleccionManualRef.current = true; // evita reintentos mientras se prueba
            try {
                if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
                const camarasDisponibles = (await navigator.mediaDevices.enumerateDevices()).filter(
                    (d) => d.kind === "videoinput"
                );
                if (camarasDisponibles.length < 2) return;
                const resultados = await Promise.all(
                    camarasDisponibles.map(async (cam) => {
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({
                                video: {
                                    deviceId: { exact: cam.deviceId },
                                    width: { ideal: 1920 },
                                    height: { ideal: 1080 },
                                },
                                audio: false,
                            });
                            const settings = stream.getVideoTracks()[0].getSettings();
                            stream.getTracks().forEach((t) => t.stop());
                            return { deviceId: cam.deviceId, area: (settings.width || 0) * (settings.height || 0) };
                        } catch {
                            return { deviceId: cam.deviceId, area: 0 };
                        }
                    })
                );
                const mejor = resultados.reduce((a, b) => (b.area > a.area ? b : a));
                if (mejor.area > 0) {
                    // Esperar a que Windows libere la cámara probada antes de abrirla de nuevo
                    await new Promise((r) => setTimeout(r, 500));
                    autoSeleccionadaRef.current = true;
                    setDeviceId(mejor.deviceId);
                }
            } catch {
                // Sin permiso todavía o error de navegador: mantener la cámara por defecto
            } finally {
                eleccionManualRef.current = false;
            }
        }, []);

        useImperativeHandle(
            ref,
            () => ({
                capture: () => {
                    if (error) return null;
                    return webcamRef.current?.getScreenshot() || null;
                },
            }),
            [error]
        );

        const videoConstraints = {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
        };

        if (error) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-center p-3">
                    <span className="text-2xl">📷</span>
                    <p className="text-[0.65rem] text-red-300 leading-snug">{error}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            setIntento((i) => i + 1); // remonta el Webcam y reintenta getUserMedia
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[0.65rem] font-semibold"
                    >
                        🔄 Reintentar cámara
                    </button>
                </div>
            );
        }

        return (
            <div className="relative w-full h-full">
                <Webcam
                    key={`${deviceId || "default"}-${intento}`}
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    forceScreenshotSourceSize
                    videoConstraints={videoConstraints}
                    onUserMedia={(stream) => {
                        // La cámara arrancó: limpiar errores, refrescar el selector y buscar la mejor (1080p)
                        setError(null);
                        onReady?.();
                        listarCamaras();
                        const altura = stream.getVideoTracks()[0].getSettings().height || 0;
                        if (altura < ALTURA_MINIMA_PREFERIDA) {
                            void elegirMejorCamara();
                        }
                    }}
                    onUserMediaError={(err) => {
                        const nombre = (err as DOMException)?.name || "";
                        // Resolución no soportada por la cámara elegida: volver a la predeterminada
                        if (nombre === "OverconstrainedError" && deviceId) {
                            setDeviceId(null);
                            return;
                        }
                        // Si la cámara auto-seleccionada falló, volver a la del navegador por defecto
                        if (autoSeleccionadaRef.current && !eleccionManualRef.current) {
                            autoSeleccionadaRef.current = false;
                            setDeviceId(null);
                            return;
                        }
                        marcarError(mensajeErrorCamara(err));
                        console.error("Error iniciando la cámara:", err);
                    }}
                    className={className}
                />
                {selectorCamaras && camaras.length > 1 && (
                    <select
                        value={deviceId || ""}
                        onChange={(e) => {
                            eleccionManualRef.current = true;
                            autoSeleccionadaRef.current = false;
                            setDeviceId(e.target.value || null);
                        }}
                        className="absolute bottom-1 right-1 text-[0.6rem] bg-black/70 text-white rounded-md px-1.5 py-0.5 border border-white/20 max-w-[70%]"
                        title="Cambiar cámara"
                    >
                        {camaras.map((c, i) => (
                            <option key={c.deviceId} value={c.deviceId}>
                                {c.label || `Cámara ${i + 1}`}
                            </option>
                        ))}
                    </select>
                )}
            </div>
        );
    }
);

WebcamCapture.displayName = "WebcamCapture";
export default WebcamCapture;
