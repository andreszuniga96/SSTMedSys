"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DICCIONARIO_RECOMENDACIONES, type OpcionDiccionario } from "@/lib/diccionario-recomendaciones";

interface DiccionarioSelectorProps {
    valorActual: string;
    onInsertar: (nuevoTexto: string) => void;
    tipo: "recomendacion" | "restriccion";
}

const MAX_ALTURA = 320; // px máximos del panel
const MARGEN_PANTALLA = 8;

export default function DiccionarioSelector({ valorActual, onInsertar, tipo }: DiccionarioSelectorProps) {
    const [open, setOpen] = useState(false);
    const [abrirArriba, setAbrirArriba] = useState(false);
    const [maxAltura, setMaxAltura] = useState(MAX_ALTURA);
    const botonRef = useRef<HTMLDivElement>(null);

    const opciones = tipo === "restriccion"
        ? DICCIONARIO_RECOMENDACIONES.filter((o) => o.categoria === "restriccion")
        : DICCIONARIO_RECOMENDACIONES.filter((o) => o.categoria !== "restriccion");

    // Calcula hacia dónde abrir y cuánto alto permitir para que el panel
    // nunca se salga de la pantalla (antes quedaba cortado por el borde).
    const medirEspacio = useCallback(() => {
        const el = botonRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const espacioAbajo = window.innerHeight - rect.bottom - MARGEN_PANTALLA;
        const espacioArriba = rect.top - MARGEN_PANTALLA;
        const haciaArriba = espacioAbajo < 200 && espacioArriba > espacioAbajo;
        setAbrirArriba(haciaArriba);
        setMaxAltura(Math.max(120, Math.min(MAX_ALTURA, haciaArriba ? espacioArriba : espacioAbajo)));
    }, []);

    const alternar = () => {
        if (open) {
            setOpen(false);
        } else {
            medirEspacio();
            setOpen(true);
        }
    };

    // Re-medir si cambia el tamaño de la ventana con el panel abierto
    useEffect(() => {
        if (!open) return;
        window.addEventListener("resize", medirEspacio);
        return () => window.removeEventListener("resize", medirEspacio);
    }, [open, medirEspacio]);

    const seleccionar = (opcion: OpcionDiccionario) => {
        let textoFinal = valorActual ? valorActual.trim() : "";
        if (textoFinal && !textoFinal.endsWith(".")) {
            textoFinal += ".";
        }
        if (textoFinal.length > 0) {
            textoFinal += "\n• " + opcion.texto;
        } else {
            textoFinal = "• " + opcion.texto;
        }
        onInsertar(textoFinal);
        setOpen(false);
    };

    return (
        <div ref={botonRef} className="relative inline-block mb-2">
            <button
                type="button"
                onClick={alternar}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', borderColor: 'var(--primary-200)' }}
            >
                <span>💡</span>
                <span>Insertar de Diccionario Experto</span>
                <span className="text-[0.65rem]">▼</span>
            </button>

            {open && (
                <div
                    className={`absolute left-0 w-[min(500px,85vw)] overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-2xl z-50 p-3 animate-scale-in ${
                        abrirArriba ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                    style={{ maxHeight: maxAltura }}
                >
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-2 border-b border-slate-100 mb-2">
                        Sugerencias Médicas Estándar (Haz clic para agregar)
                    </p>
                    <div className="space-y-1.5">
                        {opciones.map((op) => (
                            <button
                                key={op.id}
                                type="button"
                                onClick={() => seleccionar(op)}
                                className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm flex flex-col gap-1 border border-transparent hover:border-blue-100"
                            >
                                <span className="font-bold text-blue-900">{op.titulo}</span>
                                <span className="text-slate-700 text-xs leading-relaxed">{op.texto}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
