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

const SignaturePad = forwardRef<SignaturePadRef>((_props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const trazadosRef = useRef<Punto[][]>([]);
    const trazadoActualRef = useRef<Punto[]>([]);
    const dibujandoRef = useRef(false);
    const ultimoPuntoRef = useRef<Punto | null>(null);
    const [dispositivo, setDispositivo] = useState<"mouse" | "lapiz" | "tactil" | null>(null);
    const [hayTrazo, setHayTrazo] = useState(false);

    const grosorParaPresion = (presion: number) =>
        GROSOR_MIN_PLUMILLA + (GROSOR_MAX_PLUMILLA - GROSOR_MIN_PLUMILLA) * Math.min(1, Math.max(0, presion));

    const puntoDesdeEvento = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0, g: GROSOR_MOUSE };
        const rect = canvas.getBoundingClientRect();
        let g = GROSOR_MOUSE;
        if (e.pointerType === "pen") g = grosorParaPresion(e.pressure);
        else if (e.pointerType === "touch") g = GROSOR_TACTIL;
        return { x: e.clientX - rect.left, y: e.clientY - rect.top, g };
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

    const alPulsar = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        dibujandoRef.current = true;
        const p = puntoDesdeEvento(e);
        trazadoActualRef.current = [p];
        ultimoPuntoRef.current = p;
        (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
        if (e.pointerType === "pen") setDispositivo("lapiz");
        else if (e.pointerType === "touch") setDispositivo("tactil");
        else setDispositivo("mouse");
    };

    const alMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dibujandoRef.current) return;
        e.preventDefault();
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

    const alSoltar = () => {
        if (!dibujandoRef.current) return;
        dibujandoRef.current = false;
        if (trazadoActualRef.current.length > 0) {
            trazadosRef.current.push(trazadoActualRef.current);
            setHayTrazo(true);
        }
        trazadoActualRef.current = [];
        ultimoPuntoRef.current = null;
        redibujar();
    };

    const clear = useCallback(() => {
        trazadosRef.current = [];
        trazadoActualRef.current = [];
        ultimoPuntoRef.current = null;
        dibujandoRef.current = false;
        setHayTrazo(false);
        redibujar();
    }, [redibujar]);

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
                className="relative h-40 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden select-none"
            >
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                    onPointerDown={alPulsar}
                    onPointerMove={alMover}
                    onPointerUp={alSoltar}
                    onPointerCancel={alSoltar}
                />
                {!hayTrazo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-xs text-slate-400 italic">Firme aquí con el mouse o su tableta gráfica</span>
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
