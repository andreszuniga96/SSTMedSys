"use client";

import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";

export interface SignaturePadRef {
    getSignature: () => string | null;
    clear: () => void;
}

interface Punto {
    x: number;
    y: number;
    g: number; // grosor de línea ya resuelto para este punto
}

const GROSOR_MOUSE = 2.2;
const GROSOR_TACTIL = 3.2;
// Calibración del lápiz (XP-Pen): la firma se escala 3x al exportarse y luego se
// reduce a ~120x45px en el PDF, así que el grosor lógico 1.6–5.5 termina en
// ~0.7–2.4px en el certificado (legible en presión baja, bolígrafo en presión alta).
// Ajusta estos dos valores si la firma se siente muy fina (sube ambos) o muy gruesa (bájalos).
const GROSOR_MIN_PLUMILLA = 1.6;
const GROSOR_MAX_PLUMILLA = 5.5;
const PADDING_RECORTE = 6; // px lógicos de margen al recortar
const ESCALA_SALIDA = 3; // firma 3x para que se vea nítida en el PDF

// ── Retroalimentación al completar un trazo ───────────────────────────────
// Vibración (móvil) + "tic" sutil con Web Audio (funciona también en
// escritorio/tableta con lápiz). El sonido se dispara dentro del gesto del
// usuario, así que no lo bloquea la política de autoplay del navegador.
let audioCtx: AudioContext | null = null;

const obtenerAudioCtx = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
        const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        try {
            audioCtx = new Ctx();
        } catch {
            return null;
        }
    }
    return audioCtx;
};

const tocarTic = () => {
    try {
        const ctx = obtenerAudioCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 1250;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    } catch {
        // Si el navegador bloquea el audio, simplemente no suena.
    }
};

const retroalimentacionTrazo = () => {
    try {
        navigator.vibrate?.(15);
    } catch {
        // Navegadores sin soporte de vibración: ignorar.
    }
    tocarTic();
};

const SignaturePad = forwardRef<SignaturePadRef>((_props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const trazadosRef = useRef<Punto[][]>([]);
    const trazadoActualRef = useRef<Punto[]>([]);
    const dibujandoRef = useRef(false);
    const ultimoPuntoRef = useRef<Punto | null>(null);
    const [dispositivo, setDispositivo] = useState<"mouse" | "lapiz" | "tactil" | null>(null);
    const [hayTrazo, setHayTrazo] = useState(false);
    const [dibujando, setDibujando] = useState(false);

    const grosorParaPresion = (presion: number) =>
        GROSOR_MIN_PLUMILLA + (GROSOR_MAX_PLUMILLA - GROSOR_MIN_PLUMILLA) * Math.min(1, Math.max(0, presion));

    const puntoDesdeEvento = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0, g: GROSOR_MOUSE };
        const rect = canvas.getBoundingClientRect();
        // Acotar a los límites del pad: si el lápiz se sale del área, el trazo
        // continúa visible en el borde en vez de dibujar fuera de la vista.
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        let g = GROSOR_MOUSE;
        if (e.pointerType === "pen") g = grosorParaPresion(e.pressure);
        else if (e.pointerType === "touch") g = GROSOR_TACTIL;
        return { x, y, g };
    };

    const pintarTrazado = useCallback((ctx: CanvasRenderingContext2D, puntos: Punto[]) => {
        if (puntos.length === 0) return;
        ctx.strokeStyle = "#1e293b";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (puntos.length === 1) {
            ctx.fillStyle = "#1e293b";
            ctx.beginPath();
            ctx.arc(puntos[0].x, puntos[0].y, puntos[0].g / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        let prev = puntos[0];
        for (let i = 1; i < puntos.length; i++) {
            const cur = puntos[i];
            const mx = (prev.x + cur.x) / 2;
            const my = (prev.y + cur.y) / 2;
            ctx.lineWidth = cur.g;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
            ctx.stroke();
            prev = { x: mx, y: my, g: cur.g };
        }
        const ultimo = puntos[puntos.length - 1];
        ctx.lineWidth = ultimo.g;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(ultimo.x, ultimo.y);
        ctx.stroke();
    }, []);

    const redibujar = useCallback(() => {
        const canvas = canvasRef.current;
        const contenedor = contenedorRef.current;
        if (!canvas || !contenedor) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = contenedor.clientWidth;
        const h = contenedor.clientHeight;
        const anchoFisico = Math.max(1, Math.round(w * dpr));
        const altoFisico = Math.max(1, Math.round(h * dpr));
        if (canvas.width !== anchoFisico || canvas.height !== altoFisico) {
            canvas.width = anchoFisico;
            canvas.height = altoFisico;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        trazadosRef.current.forEach((trazado) => pintarTrazado(ctx, trazado));
    }, [pintarTrazado]);

    useEffect(() => {
        redibujar();
        const contenedor = contenedorRef.current;
        if (!contenedor || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(redibujar);
        ro.observe(contenedor);
        return () => ro.disconnect();
    }, [redibujar]);

    // Mientras se dibuja (lápiz/dedo), bloquea el scroll de la página para que
    // el gesto no desplace el documento aunque el puntero roce el borde del pad.
    // Se usa un listener no-pasivo a nivel de window: `touch-action: none` en el
    // canvas ya cubre el gesto que inicia sobre el pad; esto cubre además el que
    // inicia sobre el borde/contenedor o cualquier imprevisto del driver del lápiz.
    const prevenirScrollGlobal = useCallback((e: Event) => {
        if (dibujandoRef.current) e.preventDefault();
    }, []);

    const bloquearScroll = useCallback(() => {
        window.addEventListener("touchmove", prevenirScrollGlobal, { passive: false });
        window.addEventListener("wheel", prevenirScrollGlobal, { passive: false });
    }, [prevenirScrollGlobal]);

    const desbloquearScroll = useCallback(() => {
        window.removeEventListener("touchmove", prevenirScrollGlobal);
        window.removeEventListener("wheel", prevenirScrollGlobal);
    }, [prevenirScrollGlobal]);

    // Limpieza por si el componente se desmonta a mitad de un trazo
    useEffect(() => {
        return () => {
            window.removeEventListener("touchmove", prevenirScrollGlobal);
            window.removeEventListener("wheel", prevenirScrollGlobal);
        };
    }, [prevenirScrollGlobal]);

    const alPulsar = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dibujandoRef.current = true;
        setDibujando(true);
        const p = puntoDesdeEvento(e);
        trazadoActualRef.current = [p];
        ultimoPuntoRef.current = p;
        // Bloquear el scroll ANTES de capturar el puntero: si la captura falla
        // (p. ej. puntero ya liberado), el bloqueo igualmente queda activo.
        bloquearScroll();
        try {
            (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
        } catch {
            // Captura opcional: el dibujo continúa aunque el navegador la rechace.
        }
        if (e.pointerType === "pen") setDispositivo("lapiz");
        else if (e.pointerType === "touch") setDispositivo("tactil");
        else setDispositivo("mouse");
    };

    const alMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dibujandoRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const p = puntoDesdeEvento(e);
        const prev = ultimoPuntoRef.current;
        if (!prev) {
            trazadoActualRef.current.push(p);
            ultimoPuntoRef.current = p;
            return;
        }
        const mx = (prev.x + p.x) / 2;
        const my = (prev.y + p.y) / 2;
        ctx.strokeStyle = "#1e293b";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = p.g;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        ctx.stroke();
        trazadoActualRef.current.push(p);
        ultimoPuntoRef.current = { x: mx, y: my, g: p.g };
    };

    const alSoltar = (e?: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dibujandoRef.current) return;
        dibujandoRef.current = false;
        setDibujando(false);
        if (e) e.stopPropagation();
        desbloquearScroll();
        if (trazadoActualRef.current.length > 0) {
            trazadosRef.current.push(trazadoActualRef.current);
            setHayTrazo(true);
            // Confirmación sutil (sonido/vibración) al terminar cada trazo
            retroalimentacionTrazo();
        }
        trazadoActualRef.current = [];
        ultimoPuntoRef.current = null;
        redibujar();
    };

    const alPerderCaptura = (e: React.PointerEvent<HTMLCanvasElement>) => {
        // Si el navegador revoca la captura a mitad del trazo, terminar el trazo
        // y liberar el bloqueo de scroll para no dejarlo activo.
        if (!dibujandoRef.current) return;
        alSoltar(e);
    };

    const clear = useCallback(() => {
        trazadosRef.current = [];
        trazadoActualRef.current = [];
        ultimoPuntoRef.current = null;
        dibujandoRef.current = false;
        setDibujando(false);
        setHayTrazo(false);
        desbloquearScroll();
        redibujar();
    }, [redibujar, desbloquearScroll]);

    const deshacer = useCallback(() => {
        trazadosRef.current.pop();
        setHayTrazo(trazadosRef.current.length > 0);
        redibujar();
    }, [redibujar]);

    const getSignature = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || trazadosRef.current.length === 0) return null;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        const W = canvas.width;
        const H = canvas.height;
        const datos = ctx.getImageData(0, 0, W, H).data;
        let minX = W, minY = H, maxX = -1, maxY = -1;
        for (let py = 0; py < H; py++) {
            for (let px = 0; px < W; px++) {
                if (datos[(py * W + px) * 4 + 3] > 0) {
                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                }
            }
        }
        if (maxX < 0) return null;
        const dpr = window.devicePixelRatio || 1;
        const pad = PADDING_RECORTE * dpr;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(W - sx, maxX - minX + pad * 2);
        const sh = Math.min(H - sy, maxY - minY + pad * 2);
        if (sw <= 0 || sh <= 0) return null;
        const out = document.createElement("canvas");
        out.width = Math.max(1, Math.round(sw * ESCALA_SALIDA));
        out.height = Math.max(1, Math.round(sh * ESCALA_SALIDA));
        const octx = out.getContext("2d");
        if (!octx) return null;
        octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
        return out.toDataURL("image/png");
    }, []);

    useImperativeHandle(ref, () => ({ getSignature, clear }), [getSignature, clear]);

    return (
        <div>
            <div
                ref={contenedorRef}
                className="relative h-72 md:h-96 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden select-none"
                style={{ touchAction: "none", overscrollBehavior: "contain" }}
                onDragStart={(e) => e.preventDefault()}
            >
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                    style={{ touchAction: "none", overscrollBehavior: "contain" }}
                    onPointerDown={alPulsar}
                    onPointerMove={alMover}
                    onPointerUp={alSoltar}
                    onPointerCancel={alSoltar}
                    onLostPointerCapture={alPerderCaptura}
                    onContextMenu={(e) => e.preventDefault()}
                />
                {!hayTrazo && !dibujando && (
                    <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        aria-hidden="true"
                    >
                        <div className="relative w-[min(86%,32rem)] h-[58%] rounded-xl border-2 border-dashed border-slate-300/80 bg-slate-100/50">
                            <div className="absolute inset-x-6 top-4 text-center">
                                <span className="text-xs text-slate-400 italic">
                                    ✍️ Firme aquí — el área es exclusiva para su firma
                                </span>
                            </div>
                            {/* Línea guía sobre la que se firma */}
                            <div className="absolute left-[8%] right-[8%] bottom-[18%] border-t-2 border-slate-400/80" />
                            <span className="absolute inset-x-0 bottom-[calc(18%+8px)] text-center text-[0.65rem] font-semibold text-slate-500">
                                Firma del trabajador
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-slate-100 p-2 rounded-b-lg border border-t-0 border-slate-200 flex items-center justify-between flex-wrap gap-2">
                {dispositivo === "lapiz" ? (
                    <span className="text-[0.65rem] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1">
                        🖊️ Lápiz detectado — firma con sensibilidad a presión
                    </span>
                ) : dispositivo === "tactil" ? (
                    <span className="text-[0.65rem] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-1">
                        👆 Usa tu dedo para firmar
                    </span>
                ) : (
                    <span className="text-[0.65rem] text-slate-500">✍️ Firma manuscrita con sensibilidad a presión</span>
                )}
                <div className="flex gap-1 ml-auto">
                    <button
                        type="button"
                        onClick={deshacer}
                        disabled={!hayTrazo}
                        className="text-xs text-slate-600 hover:text-amber-700 font-medium px-3 py-1 rounded disabled:opacity-30"
                    >
                        ↩ Deshacer
                    </button>
                    <button
                        type="button"
                        onClick={clear}
                        disabled={!hayTrazo}
                        className="text-xs text-slate-600 hover:text-red-600 font-medium px-3 py-1 rounded disabled:opacity-30"
                    >
                        🗑 Limpiar
                    </button>
                </div>
            </div>
        </div>
    );
});

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;
