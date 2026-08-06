import type { ReactNode } from "react";

interface PageHeaderProps {
    icono: ReactNode;
    titulo: string;
    subtitulo?: string;
    acciones?: ReactNode;
}

// Encabezado estándar de los módulos del dashboard:
// tarjeta con icono, título, subtítulo y acciones (botones) a la derecha.
export default function PageHeader({ icono, titulo, subtitulo, acciones }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-premium p-6">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-teal-700 bg-teal-50 border border-teal-200 shrink-0">
                    {icono}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
                    {subtitulo && <p className="text-sm text-slate-500 mt-0.5">{subtitulo}</p>}
                </div>
            </div>
            {acciones && <div className="flex flex-wrap gap-2 shrink-0">{acciones}</div>}
        </div>
    );
}
