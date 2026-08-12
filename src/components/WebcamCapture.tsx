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

/** Clave en localStorage donde se recuerda la cámara elegida manualmente por el usuario. */
const CLAVE_CAMARA_PREFERIDA = "webcamPreferida";

/** Máximo de auto-recuperaciones del video congelado antes de mostrar el error con Reintentar. */
const MAX_AUTO_RECUPERACIONES = 3;

/** Tiempo (ms) sin recibir un frame para considerar el video congelado. */
const TIMEOUT_VIDEO_CONGELADO = 3500;

/** Tiempo (ms) de espera inicial para que el video entregue el primer frame. */
const TIMEOUT_PRIMER_FRAME = 5000;

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

/** ¿Estamos en un dispositivo móvil (teléfono/tableta)? Allí la selfie debe usar la cámara frontal. */
function esDispositivoMovil(): boolean {
    if (typeof navigator === "undefined") return false;
    try {
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    } catch {
        return false;
    }
}

const WebcamCapture = forwardRef<WebcamCaptureRef, WebcamCaptureProps>(
    ({ className, onError, onReady, selectorCamaras = true }, ref) => {
        const webcamRef = useRef<Webcam>(null);
        const [camaras, setCamaras] = useState<MediaDeviceInfo[]>([]);
        // En escritorio sin cámara elegida NO se usa facingMode: Chrome elige la cámara de
        // mayor resolución (la webcam externa 1080p) en lugar de la integrada a 720p.
        const [deviceId, setDeviceId] = useState<string | null>(() => {
            if (typeof window === "undefined") return null;
            try {
                return window.localStorage.getItem(CLAVE_CAMARA_PREFERIDA) || null;
            } catch {
                return null;
            }
        });
        const [error, setError] = useState<string | null>(null);
        const [intento, setIntento] = useState(0);
        const recuperacionesRef = useRef(0);
        const watchdogRef = useRef<number | null>(null);

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
                    const videos = dispositivos.filter((d) => d.kind === "videoinput");
                    setCamaras(videos);
                    // Si la cámara guardada ya no está conectada, olvidarla (el constraint
                    // es { ideal }, así que Chrome igual abre otra cámara sin error).
                    setDeviceId((actual) =>
                        actual && videos.length > 0 && !videos.some((v) => v.deviceId === actual) ? null : actual
                    );
                })
                .catch(() => {
                    /* sin consecuencias: el selector se llenará cuando la cámara arranque */
                });
        }, []);

        useEffect(() => {
            listarCamaras();
        }, [listarCamaras]);

        const guardarCamaraPreferida = useCallback((id: string | null) => {
            try {
                if (id) window.localStorage.setItem(CLAVE_CAMARA_PREFERIDA, id);
                else window.localStorage.removeItem(CLAVE_CAMARA_PREFERIDA);
            } catch {
                /* almacenamiento no disponible: sin consecuencias */
            }
        }, []);

        /**
         * Watchdog anti-congelamiento: si el video tiene un stream live pero NO entrega
         * frames (readyState 0 o sin frame durante TIMEOUT_VIDEO_CONGELADO), se remonta
         * el <Webcam> automáticamente para forzar un nuevo getUserMedia. Con un máximo
         * de intentos para no quedar en bucle infinito.
         */
        const detenerWatchdog = useCallback(() => {
            if (watchdogRef.current !== null) {
                window.clearTimeout(watchdogRef.current);
                watchdogRef.current = null;
            }
        }, []);

        const iniciarWatchdog = useCallback(() => {
            detenerWatchdog();
            const video = webcamRef.current?.video;
            if (!video) return;
            const inicio = Date.now();

            const recuperar = () => {
                if (recuperacionesRef.current >= MAX_AUTO_RECUPERACIONES) {
                    marcarError("La cámara dejó de responder. Pulse Reintentar cámara.");
                    return;
                }
                recuperacionesRef.current += 1;
                detenerWatchdog();
                setIntento((i) => i + 1); // remonta el <Webcam>: nuevo getUserMedia
            };

            const vigilar = () => {
                // No vigilar en pestañas ocultas ni si la página perdió el stream
                if (document.visibilityState !== "visible" || !video.srcObject) return;

                if (video.readyState >= 2 && video.videoWidth > 0) {
                    // Los frames fluyen si currentTime avanza (señal confiable en todos
                    // los navegadores; requestVideoFrameCallback no dispara en algunos
                    // entornos embebidos aunque el video se esté reproduciendo).
                    const t0 = video.currentTime;
                    watchdogRef.current = window.setTimeout(() => {
                        if (video.currentTime !== t0) {
                            recuperacionesRef.current = 0; // frames fluyendo: reiniciar contador
                            vigilar(); // sigue fluyendo: vigilar de nuevo
                        } else {
                            recuperar(); // congelado: remontar la cámara
                        }
                    }, TIMEOUT_VIDEO_CONGELADO);
                } else {
                    // El video aún no entrega el primer frame
                    if (Date.now() - inicio > TIMEOUT_PRIMER_FRAME) {
                        recuperar();
                    } else {
                        watchdogRef.current = window.setTimeout(vigilar, 500);
                    }
                }
            };

            vigilar();
        }, [detenerWatchdog, marcarError]);

        useEffect(() => detenerWatchdog, [detenerWatchdog]);

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

        const esMovil = esDispositivoMovil();
        const videoConstraints = {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            ...(deviceId
                ? { deviceId: { ideal: deviceId } }
                : esMovil
                ? { facingMode: "user" }
                : {}),
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
                            recuperacionesRef.current = 0;
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
                    onUserMedia={() => {
                        // La cámara arrancó: limpiar errores, refrescar el selector y vigilar
                        // que el video entregue frames (watchdog anti-congelamiento).
                        setError(null);
                        onReady?.();
                        listarCamaras();
                        iniciarWatchdog();
                    }}
                    onUserMediaError={(err) => {
                        const nombre = (err as DOMException)?.name || "";
                        if (nombre === "OverconstrainedError") {
                            // La cámara guardada no soporta la resolución pedida: olvidarla y reintentar
                            guardarCamaraPreferida(null);
                            setDeviceId(null);
                            setIntento((i) => i + 1);
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
                            const id = e.target.value || null;
                            setDeviceId(id);
                            guardarCamaraPreferida(id);
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
