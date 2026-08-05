"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";

export default function PacientesPage() {
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    // Modal de confirmación para eliminar
    const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any | null>(null);

    // Modal de Ver Ficha Completa
    const [modalFichaOpen, setModalFichaOpen] = useState(false);

    // Modal de Archivos
    const [modalArchivosOpen, setModalArchivosOpen] = useState(false);
    const [archivosPaciente, setArchivosPaciente] = useState<any[]>([]);
    const [subiendoArchivo, setSubiendoArchivo] = useState(false);
    const archivoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        cargarPacientes();
    }, []);

    const cargarPacientes = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("pacientes")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPacientes(data || []);
        } catch (err) {
            console.error("Error al cargar pacientes:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async () => {
        if (!pacienteSeleccionado) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("pacientes")
                .delete()
                .eq("id", pacienteSeleccionado.id);

            if (error) throw error;
            setModalEliminarOpen(false);
            setPacienteSeleccionado(null);
            toast.success("Paciente eliminado correctamente.");
            cargarPacientes();
        } catch (err) {
            console.error("Error al eliminar paciente:", err);
            toast.error("No se pudo eliminar el paciente. Puede que tenga evaluaciones médicas asociadas.");
        }
    };

    const cargarArchivos = async (pacienteId: string) => {
        const supabase = createClient();
        const { data, error } = await supabase.storage.from("archivos_pacientes").list(pacienteId);
        if (data) {
            setArchivosPaciente(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
        }
    };

    const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !pacienteSeleccionado) return;
        const file = e.target.files[0];
        setSubiendoArchivo(true);
        const supabase = createClient();
        const filePath = `${pacienteSeleccionado.id}/${Date.now()}_${file.name}`;
        
        const { error } = await supabase.storage.from("archivos_pacientes").upload(filePath, file);
        setSubiendoArchivo(false);
        if (archivoInputRef.current) archivoInputRef.current.value = "";
        
        if (!error) {
            toast.success("Archivo subido exitosamente.");
            cargarArchivos(pacienteSeleccionado.id);
        } else {
            toast.error("Error al subir el archivo. ¿Creaste el bucket 'archivos_pacientes' y lo hiciste público?");
        }
    };

    const verArchivo = (fileName: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from("archivos_pacientes").getPublicUrl(`${pacienteSeleccionado.id}/${fileName}`);
        if (data) {
            window.open(data.publicUrl, "_blank");
        }
    };

    const generarLinkTelemedicina = (paciente?: any) => {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const link = `${baseUrl}/pre-atencion`;
        if (paciente) {
            const msg = `Hola ${paciente.nombre_completo}, le saluda la Dra. Viviana Quiroz. Por favor ingrese al siguiente enlace para adjuntar los documentos de su teleconsulta: ${link}`;
            window.open(`https://api.whatsapp.com/send?phone=${paciente.movil}&text=${encodeURIComponent(msg)}`, "_blank");
        } else {
            window.open(link, "_blank");
        }
    };

    const pacientesFiltrados = pacientes.filter((p) => {
        const term = busqueda.toLowerCase();
        return (
            p.nombre_completo?.toLowerCase().includes(term) ||
            p.documento_identidad?.toLowerCase().includes(term) ||
            p.eps?.toLowerCase().includes(term) ||
            p.profesion?.toLowerCase().includes(term) ||
            p.correo_electronico?.toLowerCase().includes(term) ||
            p.movil?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 card-premium p-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Gestión de Pacientes (CRUD)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Directorio unificado de trabajadores registrados en la plataforma
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => generarLinkTelemedicina()}
                        className="btn-secondary text-sm"
                        title="Abrir portal de Pre-Atención de Telemedicina"
                    >
                        🔗 Ver Portal Pre-Atención
                    </button>
                    <Link href="/dashboard/pacientes/nuevo" className="btn-primary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Paciente
                    </Link>
                </div>
            </div>

            {/* Search + Quick Stats */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="input-premium pl-10"
                        placeholder="Buscar por nombre, documento o EPS..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                    Total Registrados: {pacientesFiltrados.length}
                </div>
            </div>

            {/* Patients Table */}
            <div className="section-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Paciente</th>
                                <th>Documento</th>
                                <th>Contacto</th>
                                <th>Seguridad Social</th>
                                <th>Lugar Residencia</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8">
                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        <p className="text-xs text-slate-500 mt-2">Cargando directorio de trabajadores...</p>
                                    </td>
                                </tr>
                            ) : pacientesFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-slate-400">
                                        <p className="text-3xl mb-2">👤</p>
                                        <p className="font-semibold">No se encontraron pacientes registrados</p>
                                        <Link href="/dashboard/pacientes/nuevo" className="btn-primary text-xs mt-3 inline-flex">
                                            + Registrar Primer Paciente
                                        </Link>
                                    </td>
                                </tr>
                            ) : (
                                pacientesFiltrados.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                {p.foto_url ? (
                                                    <img src={p.foto_url} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                                                        {p.nombre_completo?.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <button
                                                        onClick={() => {
                                                            setPacienteSeleccionado(p);
                                                            setModalFichaOpen(true);
                                                        }}
                                                        className="font-bold text-slate-900 text-sm hover:text-blue-600 text-left cursor-pointer"
                                                    >
                                                        {p.nombre_completo}
                                                    </button>
                                                    <div className="text-[0.7rem] text-slate-500">{p.profesion || "Trabajador"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-semibold text-xs text-slate-800">{p.tipo_documento || "CC"} {p.documento_identidad}</div>
                                        </td>
                                        <td>
                                            <div className="text-xs text-slate-700">📱 {p.movil || "N/R"}</div>
                                            <div className="text-[0.65rem] text-slate-500">✉️ {p.correo_electronico || "N/R"}</div>
                                        </td>
                                        <td>
                                            <span className="badge badge-blue text-[0.65rem]">EPS: {p.eps || "N/A"}</span>
                                            <span className="badge badge-amber text-[0.65rem] ml-1">ARL: {p.arl || "N/A"}</span>
                                        </td>
                                        <td>
                                            <div className="text-xs text-slate-700">{p.lugar_residencia || p.direccion || "Pasto"}</div>
                                        </td>
                                        <td className="text-right space-x-1">
                                            <button
                                                onClick={() => generarLinkTelemedicina(p)}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold"
                                                title="Enviar WhatsApp de Pre-Atención"
                                            >
                                                📲 WA
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPacienteSeleccionado(p);
                                                    setModalFichaOpen(true);
                                                }}
                                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                                                title="Ver Ficha Completa"
                                            >
                                                👁️ Ficha
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setPacienteSeleccionado(p);
                                                    cargarArchivos(p.id);
                                                    setModalArchivosOpen(true);
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold"
                                                title="Gestionar Archivos del Paciente"
                                            >
                                                📎 Archivos
                                            </button>
                                            <Link
                                                href={`/dashboard/pacientes/${p.id}/editar`}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold inline-block"
                                                title="Editar Paciente"
                                            >
                                                ✏️ Editar
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setPacienteSeleccionado(p);
                                                    setModalEliminarOpen(true);
                                                }}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
                                                title="Eliminar Paciente"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FICHA TÉCNICA DEL PACIENTE */}
            {modalFichaOpen && pacienteSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalFichaOpen(false)}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
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
                                {pacienteSeleccionado.foto_url ? (
                                    <img src={pacienteSeleccionado.foto_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow">
                                        {pacienteSeleccionado.nombre_completo?.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-slate-900 text-base">{pacienteSeleccionado.nombre_completo}</h4>
                                    <p className="text-xs text-slate-500">{pacienteSeleccionado.tipo_documento || "CC"} {pacienteSeleccionado.documento_identidad}</p>
                                    <p className="text-xs font-semibold text-blue-700 mt-1">{pacienteSeleccionado.profesion || "Sin cargo especificado"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Fecha Nacimiento</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.fecha_nacimiento || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Género</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.genero || "Femenino"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Teléfono Celular</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.movil || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Correo Electrónico</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.correo_electronico || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">EPS</p>
                                    <p className="font-bold text-blue-700">{pacienteSeleccionado.eps || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">ARL</p>
                                    <p className="font-bold text-amber-700">{pacienteSeleccionado.arl || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Fondo Pensión</p>
                                    <p className="font-bold text-emerald-700">{pacienteSeleccionado.fondo_pension || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Residencia</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.lugar_residencia || pacienteSeleccionado.direccion || "N/R"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                            <Link
                                href={`/dashboard/evaluaciones/nueva?paciente_id=${pacienteSeleccionado.id}`}
                                className="btn-primary text-xs py-1.5"
                            >
                                🩺 Crear Evaluación Médica
                            </Link>
                            <div className="flex gap-2">
                                <Link href={`/dashboard/pacientes/${pacienteSeleccionado.id}/editar`} className="btn-secondary text-xs py-1.5">
                                    ✏️ Editar Paciente
                                </Link>
                                <button onClick={() => setModalFichaOpen(false)} className="btn-secondary text-xs py-1.5">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINAR */}
            {modalEliminarOpen && pacienteSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalEliminarOpen(false)}>
                    <div className="modal-content max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl mb-2">
                                ⚠️
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">¿Eliminar Paciente?</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Se eliminará a <strong>{pacienteSeleccionado.nombre_completo}</strong> del directorio. Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3 pt-2">
                            <button onClick={() => setModalEliminarOpen(false)} className="btn-secondary text-xs">
                                Cancelar
                            </button>
                            <button onClick={handleEliminar} className="btn-danger text-xs">
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ARCHIVOS */}
            {modalArchivosOpen && pacienteSeleccionado && (
                <div className="modal-overlay" onClick={() => setModalArchivosOpen(false)}>
                    <div className="modal-content max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Archivos del Paciente</h3>
                                <p className="text-xs text-slate-500">Documentos y exámenes de {pacienteSeleccionado.nombre_completo}</p>
                            </div>
                            <button onClick={() => setModalArchivosOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">Subir nuevo archivo (PDF/Imagen)</p>
                                <p className="text-xs text-slate-500">Máximo 5MB por archivo</p>
                            </div>
                            <div>
                                <input 
                                    type="file" 
                                    accept=".pdf,image/*" 
                                    className="hidden" 
                                    ref={archivoInputRef} 
                                    onChange={handleSubirArchivo} 
                                />
                                <button 
                                    disabled={subiendoArchivo}
                                    onClick={() => archivoInputRef.current?.click()}
                                    className="btn-primary py-1.5 px-3 text-sm"
                                >
                                    {subiendoArchivo ? "Subiendo..." : "📁 Seleccionar Archivo"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {archivosPaciente.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <p className="text-2xl mb-2">📂</p>
                                    <p className="text-sm font-semibold">No hay archivos guardados para este paciente</p>
                                </div>
                            ) : (
                                archivosPaciente.map((archivo) => (
                                    <div key={archivo.name} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{archivo.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 truncate w-64 md:w-96" title={archivo.name}>
                                                    {archivo.name.split('_').slice(1).join('_') || archivo.name}
                                                </p>
                                                <p className="text-[0.65rem] text-slate-500">
                                                    {(archivo.metadata?.size / 1024).toFixed(1)} KB • {new Date(archivo.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => verArchivo(archivo.name)}
                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                        >
                                            Ver Archivo
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}