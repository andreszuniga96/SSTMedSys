import type { ReactNode } from "react";

interface ModalProps {
    abierto: boolean;
    onCerrar: () => void;
    titulo: string;
    children: ReactNode;
    footer?: ReactNode;
}

// Modal estándar del dashboard: usa las clases .modal-overlay/.modal-content
// del design system (animación scaleIn, blur, foco en el contenido).
export default function Modal({ abierto, onCerrar, titulo, children, footer }: ModalProps) {
    if (!abierto) return null;
    // p-4: .modal-overlay no trae padding y .modal-content es width:100%
    // (sin margen, el modal quedaría pegado a los bordes en móvil)
    return (
        <div className="modal-overlay p-4" onClick={onCerrar}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
            >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                    <h3 className="font-bold text-slate-900">{titulo}</h3>
                    <button
                        onClick={onCerrar}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Cerrar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {children}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
