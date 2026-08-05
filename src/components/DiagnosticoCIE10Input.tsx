"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { buscarDiagnosticos, type DiagnosticoCIE10 } from "@/lib/diagnosticos-cie10";

interface DiagnosticoCIE10InputProps {
    seleccionados: DiagnosticoCIE10[];
    onChange: (diagnosticos: DiagnosticoCIE10[]) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    Osteomuscular: "bg-orange-100 text-orange-700",
    Cardiovascular: "bg-red-100 text-red-700",
    Respiratorio: "bg-cyan-100 text-cyan-700",
    Visual: "bg-blue-100 text-blue-700",
    Auditivo: "bg-purple-100 text-purple-700",
    Mental: "bg-pink-100 text-pink-700",
    Dermatológico: "bg-amber-100 text-amber-700",
    Endocrino: "bg-emerald-100 text-emerald-700",
    Digestivo: "bg-yellow-100 text-yellow-700",
    Neurológico: "bg-indigo-100 text-indigo-700",
    Urinario: "bg-teal-100 text-teal-700",
    Traumático: "bg-rose-100 text-rose-700",
    Intoxicación: "bg-lime-100 text-lime-700",
    Examen: "bg-slate-100 text-slate-700",
};

export default function DiagnosticoCIE10Input({ seleccionados, onChange }: DiagnosticoCIE10InputProps) {
    const [query, setQuery] = useState("");
    const [resultados, setResultados] = useState<DiagnosticoCIE10[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusIndex, setFocusIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback((value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            const results = buscarDiagnosticos(value);
            // Filter out already selected
            const filtered = results.filter(
                (r) => !seleccionados.some((s) => s.codigo === r.codigo)
            );
            setResultados(filtered);
            setShowDropdown(filtered.length > 0);
            setFocusIndex(-1);
        }, 200);
    }, [seleccionados]);

    const agregarDiagnostico = useCallback((d: DiagnosticoCIE10) => {
        if (!seleccionados.some((s) => s.codigo === d.codigo)) {
            onChange([...seleccionados, d]);
        }
        setQuery("");
        setShowDropdown(false);
        setResultados([]);
        inputRef.current?.focus();
    }, [seleccionados, onChange]);

    const removerDiagnostico = useCallback((codigo: string) => {
        onChange(seleccionados.filter((s) => s.codigo !== codigo));
    }, [seleccionados, onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusIndex((prev) => Math.min(prev + 1, resultados.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && focusIndex >= 0) {
            e.preventDefault();
            agregarDiagnostico(resultados[focusIndex]);
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        } else if (e.key === "Backspace" && query === "" && seleccionados.length > 0) {
            removerDiagnostico(seleccionados[seleccionados.length - 1].codigo);
        }
    };

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            {/* Selected chips */}
            {seleccionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {seleccionados.map((d) => (
                        <div key={d.codigo} className="cie10-chip animate-scale-in">
                            <span className="font-bold">{d.codigo}</span>
                            <span className="opacity-75">—</span>
                            <span>{d.nombre}</span>
                            <button
                                type="button"
                                onClick={() => removerDiagnostico(d.codigo)}
                                title="Eliminar"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search input */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (resultados.length > 0) setShowDropdown(true);
                    }}
                    placeholder="Buscar por código (M54.5) o nombre (lumbago)..."
                    className="input-premium pl-10"
                />
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div className="cie10-dropdown animate-fade-in">
                    {resultados.map((d, i) => (
                        <div
                            key={d.codigo}
                            className={`cie10-item flex items-center gap-3 ${i === focusIndex ? "!bg-blue-50" : ""}`}
                            onClick={() => agregarDiagnostico(d)}
                            onMouseEnter={() => setFocusIndex(i)}
                        >
                            <span className="font-bold text-sm min-w-[4rem]" style={{ color: 'var(--primary-700)' }}>
                                {d.codigo}
                            </span>
                            <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                                {d.nombre}
                            </span>
                            <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[d.categoria] || "bg-slate-100 text-slate-600"}`}>
                                {d.categoria}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Helper text */}
            <p className="text-[0.7rem] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Escriba al menos 2 caracteres. Use código CIE-10 o nombre del diagnóstico. 
                {seleccionados.length > 0 && ` · ${seleccionados.length} diagnóstico(s) seleccionado(s)`}
            </p>
        </div>
    );
}
