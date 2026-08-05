"use client";

import { useState } from "react";
import { DICCIONARIO_RECOMENDACIONES, type OpcionDiccionario } from "@/lib/diccionario-recomendaciones";

interface DiccionarioSelectorProps {
    valorActual: string;
    onInsertar: (nuevoTexto: string) => void;
    tipo: "recomendacion" | "restriccion";
}

export default function DiccionarioSelector({ valorActual, onInsertar, tipo }: DiccionarioSelectorProps) {
    const [open, setOpen] = useState(false);

    const opciones = tipo === "restriccion"
        ? DICCIONARIO_RECOMENDACIONES.filter((o) => o.categoria === "restriccion")
        : DICCIONARIO_RECOMENDACIONES.filter((o) => o.categoria !== "restriccion");

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
        <div className="relative inline-block mb-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', borderColor: 'var(--primary-200)' }}
            >
                <span>💡</span>
                <span>Insertar de Diccionario Experto</span>
                <span className="text-[0.65rem]">▼</span>
            </button>

            {open && (
                <div
                    className="absolute left-0 top-full mt-1 w-[500px] max-h-80 overflow-y-auto bg-white border border-slate-300 rounded-xl shadow-2xl z-50 p-3 animate-scale-in"
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
