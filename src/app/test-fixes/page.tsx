"use client";

import { useState } from "react";
import DiccionarioSelector from "@/components/DiccionarioSelector";
import DiagnosticoCIE10Input from "@/components/DiagnosticoCIE10Input";
import SignaturePad from "@/components/SignaturePad";
import type { DiagnosticoCIE10 } from "@/lib/diagnosticos-cie10";

const MOCK_PACIENTE = {
    id: "mock-1",
    nombre_completo: "MARIA CAMILA ROSERO CRIOLLO",
    tipo_documento: "CC",
    documento_identidad: "1085324567",
    profesion: "Auxiliar de enfermería",
    fecha_nacimiento: "1990-05-14",
    genero: "Femenino",
    estado_civil: "Soltera",
    escolaridad: "Técnico",
    movil: "310 555 8899",
    correo_electronico: "maria.rosero@correo.com.co",
    eps: "NUEVA EPS",
    arl: "SURA ARL",
    fondo_pension: "COLPENSIONES",
    lugar_residencia: "Tuquerres - Nariño",
    direccion: "Calle 10 # 5 - 30 Barrio Centro",
    firma_url: null,
    origen: "presencial",
};

export default function TestFixesPage() {
    const [restricciones, setRestricciones] = useState("");
    const [diagnosticos, setDiagnosticos] = useState<DiagnosticoCIE10[]>([]);
    const [modalFichaOpen, setModalFichaOpen] = useState(true);

    return (
        <div className="min-h-screen bg-[#f0fdfa] p-6 space-y-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900">
                    🔧 Página de prueba para revisar los bugs reportados (Ficha, Restricciones, CIE-10, Firma).
                </div>

                {/* ===== 1. FICHA DEL PACIENTE (modal como en pacientes/page.tsx) ===== */}
                <section className="section-premium animate-fade-in">
                    <div className="section-header section-header-blue">
                        <span className="text-lg">📋</span>
                        <h3 className="text-sm font-bold text-blue-900">1. Ficha Médica Ocupacional</h3>
                    </div>
                    <div className="section-body">
                        <button onClick={() => setModalFichaOpen(true)} className="btn-primary text-sm">
                            👁️ Ver Ficha del Paciente
                        </button>
                    </div>
                </section>

                {/* ===== 2. RESTRICCIONES LABORALES (paso 3) ===== */}
                <section className="section-premium animate-fade-in">
                    <div className="section-header section-header-blue">
                        <span className="text-lg">📊</span>
                        <h3 className="text-sm font-bold text-blue-900">2. Valoración Médica — Restricciones Laborales</h3>
                    </div>
                    <div className="section-body space-y-5">
                        <div>
                            <label className="label-premium flex justify-between items-center">
                                <span>Restricciones Laborales</span>
                            </label>
                            <DiccionarioSelector
                                tipo="restriccion"
                                valorActual={restricciones}
                                onInsertar={(texto) => setRestricciones(texto)}
                            />
                            <textarea
                                rows={2}
                                className="input-premium"
                                placeholder="Seleccione de arriba o escriba restricciones especificadas..."
                                value={restricciones}
                                onChange={(e) => setRestricciones(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* ===== 3. CIE-10 (paso 6) ===== */}
                <section className="section-premium animate-fade-in">
                    <div className="section-header section-header-blue">
                        <span className="text-lg">🏷️</span>
                        <h3 className="text-sm font-bold text-blue-900">3. Diagnósticos CIE-10</h3>
                    </div>
                    <div className="section-body">
                        <DiagnosticoCIE10Input seleccionados={diagnosticos} onChange={setDiagnosticos} />
                    </div>
                </section>

                {/* ===== 4. FIRMA DEL TRABAJADOR (paso 6) ===== */}
                <section className="section-premium animate-fade-in">
                    <div className="section-header section-header-emerald">
                        <span className="text-lg">✍️</span>
                        <h3 className="text-sm font-bold text-emerald-900">4. Firma del Trabajador</h3>
                    </div>
                    <div className="section-body space-y-4">
                        <SignaturePad />
                    </div>
                </section>
            </div>

            {/* ===== Modal Ficha (mismo markup que pacientes/page.tsx) ===== */}
            {modalFichaOpen && (
                <div className="modal-overlay" onClick={() => setModalFichaOpen(false)}>
                    <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📋</span>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Ficha Médica Ocupacional</h3>
                                    <p className="text-xs text-slate-500">Datos registrados del trabajador</p>
                                </div>
                            </div>
                            <button onClick={() => setModalFichaOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow flex-shrink-0">
                                    {MOCK_PACIENTE.nombre_completo?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 text-base break-words">{MOCK_PACIENTE.nombre_completo}</h4>
                                    <p className="text-xs text-slate-500 break-words">{MOCK_PACIENTE.tipo_documento} {MOCK_PACIENTE.documento_identidad}</p>
                                    <p className="text-xs font-semibold text-blue-700 mt-1">{MOCK_PACIENTE.profesion}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Fecha Nacimiento</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.fecha_nacimiento}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Género</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.genero}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Estado Civil</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.estado_civil}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Nivel Educativo</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.escolaridad}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Teléfono Celular</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.movil}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Correo Electrónico</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.correo_electronico}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">EPS</p>
                                    <p className="font-bold text-blue-700 break-words">{MOCK_PACIENTE.eps}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">ARL</p>
                                    <p className="font-bold text-amber-700 break-words">{MOCK_PACIENTE.arl}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Fondo Pensión</p>
                                    <p className="font-bold text-emerald-700 break-words">{MOCK_PACIENTE.fondo_pension}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Residencia / Dirección</p>
                                    <p className="font-bold text-slate-800 break-words">{MOCK_PACIENTE.lugar_residencia} — {MOCK_PACIENTE.direccion}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 min-w-0">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Cargo a desempeñar</p>
                                    <p className="font-bold text-purple-700 break-words">{MOCK_PACIENTE.profesion}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
                            <button className="btn-primary text-xs py-1.5">🩺 Crear Evaluación Médica</button>
                            <div className="flex flex-wrap gap-2">
                                <button className="btn-secondary text-xs py-1.5">✏️ Editar Paciente</button>
                                <button onClick={() => setModalFichaOpen(false)} className="btn-secondary text-xs py-1.5">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
