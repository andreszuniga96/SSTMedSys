"use client";

import toast from "react-hot-toast";

// Descarga un CSV con BOM UTF-8 (abre correctamente en Excel en español).
// Separador ";" y escape de comillas/separadores/saltos de línea.
export const descargarCSV = (nombreArchivo: string, filas: Record<string, any>[]) => {
    if (filas.length === 0) return toast.error("No hay datos para exportar.");
    const columnas = Object.keys(filas[0]);
    const escapar = (v: any) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[\",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const contenido = [
        columnas.join(";"),
        ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(";")),
    ].join("\r\n");
    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreArchivo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};
