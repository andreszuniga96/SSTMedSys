interface LoadingStateProps {
    texto?: string;
}

// Estado de carga estándar de los módulos del dashboard.
export default function LoadingState({ texto = "Cargando..." }: LoadingStateProps) {
    return (
        <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="text-xs text-slate-500 mt-3">{texto}</p>
        </div>
    );
}
