"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import { PUBLIC_APP_URL } from "@/lib/config";
import PageHeader from "@/components/dashboard/PageHeader";

type TabId = "presencial" | "virtual" | "preatencion";

export default function PacientesPage() {
    const [pacientes, setPacientes] = useState<any[]>([]);
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [tab, setTab] = useState<TabId>("presencial");
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [pacientesConArchivos, setPacientesConArchivos] = useState<Record<string, boolean>>({});

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

    // Modal de Preview
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<'pdf' | 'image' | null>(null);

    // Modal de detalles de solicitud pre-atención
    const [modalSolicitudOpen, setModalSolicitudOpen] = useState(false);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any | null>(null);
    const [registrandoPaciente, setRegistrandoPaciente] = useState(false);

    const cargarPacientes = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("pacientes")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (data) {
                const conArchivos: Record<string, boolean> = {};
                await Promise.all(data.map(async (p) => {
                    const { data: files } = await supabase.storage.from("archivos_pacientes").list(p.id);
                    if (files && files.filter(f => f.name !== '.emptyFolderPlaceholder').length > 0) {
                        conArchivos[p.id] = true;
                    } else {
                        conArchivos[p.id] = false;
                    }
                }));
                setPacientesConArchivos(conArchivos);
            }

            setPacientes(data || []);
        } catch (err) {
            console.error("Error al cargar pacientes:", err);
        } finally {
            setLoading(false);
        }
    };

    const cargarSolicitudes = async () => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("solicitudes_preatencion")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setSolicitudes(data || []);
        } catch (err) {
            console.error("Error al cargar solicitudes pre-atención:", err);
        }
    };

    useEffect(() => {
        cargarPacientes();
        cargarSolicitudes();
        // Prellenar búsqueda si llega con ?q= (ej. desde el historial de empresa)
        if (typeof window !== "undefined") {
            const q = new URLSearchParams(window.location.search).get("q");
            if (q) setBusqueda(q);
        }
    }, []);

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
            setModalArchivosOpen(false);
            setPacientesConArchivos(prev => ({ ...prev, [pacienteSeleccionado.id]: true }));
            cargarArchivos(pacienteSeleccionado.id);
        } else {
            console.error("Upload error:", error);
            toast.error(`Error al subir el archivo: ${error.message || 'Desconocido'}`);
        }
    };

    const verArchivo = (fileName: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from("archivos_pacientes").getPublicUrl(`${pacienteSeleccionado.id}/${fileName}`);
        if (data) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            setPreviewType(ext === 'pdf' ? 'pdf' : 'image');
            setPreviewUrl(data.publicUrl);
            setPreviewModalOpen(true);
        }
    };

    const verUltimoArchivo = async (pacienteId: string) => {
        const supabase = createClient();
        const { data, error } = await supabase.storage.from("archivos_pacientes").list(pacienteId, {
            sortBy: { column: 'created_at', order: 'desc' }
        });
        
        if (error) {
            console.error("Error al listar archivos:", error);
            toast.error(`Error de permisos: ${error.message}`);
            return;
        }

        if (data && data.length > 0) {
            const validFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder');
            if (validFiles.length > 0) {
                const latestFile = validFiles[0];
                const { data: urlData } = supabase.storage.from("archivos_pacientes").getPublicUrl(`${pacienteId}/${latestFile.name}`);
                if (urlData) {
                    const ext = latestFile.name.split('.').pop()?.toLowerCase();
                    setPreviewType(ext === 'pdf' ? 'pdf' : 'image');
                    setPreviewUrl(urlData.publicUrl);
                    setPreviewModalOpen(true);
                    return;
                }
            }
        }
        console.warn("Archivos devueltos por list():", data);
        toast.error("No se encontró ningún archivo válido para previsualizar.");
    };

    // ==================== ENLACE PORTAL PRE-ATENCIÓN ====================
    const generarLinkTelemedicina = (paciente?: any, soloCopiar: boolean = false) => {
        const baseUrl = PUBLIC_APP_URL;
        const params = new URLSearchParams();
        if (paciente) {
            params.set("nombre", paciente.nombre_completo || "");
            params.set("cedula", paciente.documento_identidad || "");
            params.set("telefono", paciente.movil || "");
            params.set("correo", paciente.correo_electronico || "");
            params.set("empresa", paciente.empresa_en_mision || "");
            params.set("cargo", paciente.profesion || "");
            params.set("eps", paciente.eps || "");
            params.set("arl", paciente.arl || "");
            params.set("fecha_nacimiento", paciente.fecha_nacimiento || "");
            params.set("genero", paciente.genero || "");
            params.set("ciudad", paciente.lugar_residencia || "");
            params.set("direccion", paciente.direccion || "");
        }
        const link = `${baseUrl}/pre-atencion${params.toString() ? `?${params.toString()}` : ""}`;

        if (soloCopiar) {
            navigator.clipboard?.writeText(link).then(() => {
                toast.success("Enlace de pre-atención copiado al portapapeles");
            });
            return;
        }

        if (paciente?.movil) {
            const msg = `Hola ${paciente.nombre_completo}, le saluda la Dra. Viviana Quiroz. Ingrese al siguiente enlace para completar sus datos y adjuntar los documentos (cédula, firma y exámenes) para su teleconsulta médica ocupacional: ${link}`;
            window.open(`https://api.whatsapp.com/send?phone=${paciente.movil}&text=${encodeURIComponent(msg)}`, "_blank");
        } else {
            window.open(link, "_blank");
        }
    };

    const enviarWhatsAppSolicitud = (solicitud: any) => {
        const baseUrl = PUBLIC_APP_URL;
        const link = `${baseUrl}/pre-atencion`;
        const telefono = solicitud.paciente_telefono;
        if (!telefono) return toast.error("La solicitud no registra número de teléfono.");
        const msg = `Hola ${solicitud.paciente_nombre}, le saluda la Dra. Viviana Quiroz. Le recordamos completar el formulario de pre-atención para su teleconsulta médica: ${link}`;
        window.open(`https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(msg)}`, "_blank");
    };

    // ==================== CONVERTIR SOLICITUD EN PACIENTE ====================
    const urlPublicaBiometria = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        const supabase = createClient();
        const { data } = supabase.storage.from("biometria_pacientes").getPublicUrl(path);
        return data?.publicUrl || null;
    };

    const registrarSolicitudComoPaciente = async (solicitud: any) => {
        setRegistrandoPaciente(true);
        try {
            const supabase = createClient();

            // Evitar duplicados por documento o por solicitud ya procesada
            const { data: existentes } = await supabase
                .from("pacientes")
                .select("id, nombre_completo")
                .eq("documento_identidad", solicitud.paciente_cedula);

            if (existentes && existentes.length > 0) {
                toast.error(`Ya existe un paciente con documento ${solicitud.paciente_cedula}: ${existentes[0].nombre_completo}`);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sesión no encontrada");

            const firmaUrl = urlPublicaBiometria(solicitud.firma_foto_url);
            const selfieUrl = urlPublicaBiometria(solicitud.selfie_foto_url);
            const cedulaUrl = urlPublicaBiometria(solicitud.cedula_foto_url);

            const { data: nuevoPaciente, error } = await supabase
                .from("pacientes")
                .insert({
                    nombre_completo: solicitud.paciente_nombre,
                    tipo_documento: "CC",
                    documento_identidad: solicitud.paciente_cedula,
                    movil: solicitud.paciente_telefono,
                    correo_electronico: solicitud.correo_electronico,
                    fecha_nacimiento: solicitud.fecha_nacimiento,
                    genero: solicitud.genero || "Femenino",
                    eps: solicitud.eps,
                    arl: solicitud.arl,
                    profesion: solicitud.cargo,
                    lugar_residencia: solicitud.lugar_residencia,
                    direccion: solicitud.direccion,
                    origen: "virtual",
                    firma_url: firmaUrl,
                    foto_url: selfieUrl,
                    cedula_foto_url: cedulaUrl,
                    solicitud_preatencion_id: solicitud.id,
                    medico_id: user.id,
                })
                .select()
                .single();

            if (error) throw error;

            // Vincular contexto laboral con la empresa registrada (si existe)
            if (solicitud.empresa_nombre) {
                const { data: empresaMatch } = await supabase
                    .from("empresas")
                    .select("id")
                    .ilike("nombre", solicitud.empresa_nombre)
                    .limit(1);
                const empresaId = empresaMatch?.[0]?.id || null;
                await supabase.from("contexto_laboral").insert({
                    paciente_id: nuevoPaciente.id,
                    empresa_id: empresaId,
                    empresa_nombre: solicitud.empresa_nombre,
                    cargo: solicitud.cargo,
                    lugar_realizacion: solicitud.lugar_residencia || "Telemedicina",
                });
            }

            // Marcar solicitud como procesada
            const { error: errSolicitud } = await supabase
                .from("solicitudes_preatencion")
                .update({ estado: "procesada", paciente_id: nuevoPaciente.id })
                .eq("id", solicitud.id);
            if (errSolicitud) throw errSolicitud;

            toast.success(`✅ Paciente virtual registrado: ${solicitud.paciente_nombre}. Su firma quedó vinculada para el certificado.`);
            setModalSolicitudOpen(false);
            setSolicitudSeleccionada(null);
            cargarPacientes();
            cargarSolicitudes();
        } catch (err: any) {
            console.error("Error registrando paciente virtual:", err);
            toast.error(`Error al registrar paciente: ${err.message}`);
        } finally {
            setRegistrandoPaciente(false);
        }
    };

    // ==================== FILTROS ====================
    const esPresencial = (p: any) => (p.origen || "presencial") === "presencial";
    const esVirtual = (p: any) => (p.origen || "presencial") === "virtual";

    const pacientesFiltrados = pacientes.filter((p) => {
        const term = busqueda.toLowerCase();
        const coincideBusqueda =
            p.nombre_completo?.toLowerCase().includes(term) ||
            p.documento_identidad?.toLowerCase().includes(term) ||
            p.eps?.toLowerCase().includes(term) ||
            p.profesion?.toLowerCase().includes(term) ||
            p.correo_electronico?.toLowerCase().includes(term) ||
            p.movil?.toLowerCase().includes(term);
        if (!coincideBusqueda) return false;
        if (tab === "presencial") return esPresencial(p);
        if (tab === "virtual") return esVirtual(p);
        return false;
    });

    const totalPresenciales = pacientes.filter(esPresencial).length;
    const totalVirtuales = pacientes.filter(esVirtual).length;
    const solicitudesPendientes = solicitudes.filter((s) => s.estado !== "procesada");

    const tabs: { id: TabId; label: string; count: number; desc: string }[] = [
        { id: "presencial", label: "Presenciales", count: totalPresenciales, desc: "Creados por la doctora en consultorio" },
        { id: "virtual", label: "Virtuales (Telemedicina)", count: totalVirtuales, desc: "Diligenciaron el portal pre-atención" },
        { id: "preatencion", label: "Pre-Atención", count: solicitudesPendientes.length, desc: "Solicitudes entrantes por procesar" },
    ];

    const estadoSolicitudStyle = (estado: string) => {
        switch (estado) {
            case "completada": return "badge-amber";
            case "procesada": return "badge-green";
            default: return "badge-slate";
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header Top Bar */}
            <PageHeader
                icono={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                }
                titulo="Gestión de Pacientes"
                subtitulo="Directorio unificado de trabajadores · Presenciales y Telemedicina"
                acciones={
                    <>
                        <button
                            onClick={() => generarLinkTelemedicina()}
                            className="btn-secondary text-sm"
                            title="Abrir portal de Pre-Atención de Telemedicina"
                        >
                            🔗 Ver Portal Pre-Atención
                        </button>
                        <button
                            onClick={() => generarLinkTelemedicina(undefined, true)}
                            className="btn-secondary text-sm"
                            title="Copiar enlace del portal para enviar por correo o WhatsApp"
                        >
                            📋 Copiar Enlace
                        </button>
                        <Link href="/dashboard/pacientes/nuevo" className="btn-primary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo Paciente
                        </Link>
                    </>
                }
            />

            {/* Tabs Presencial / Virtual / Pre-Atención */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-300 group ${
                            tab === t.id
                                ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md"
                                : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                tab === t.id ? "bg-teal-600 text-white shadow-lg" : "bg-slate-100 text-slate-500"
                            }`}>
                                {t.id === "presencial" ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                ) : t.id === "virtual" ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className={`font-bold text-sm ${tab === t.id ? "text-teal-900" : "text-slate-800"}`}>
                                        {t.label}
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        tab === t.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                                    }`}>
                                        {t.count}
                                    </span>
                                </div>
                                <p className="text-[0.7rem] text-slate-500 mt-0.5">{t.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Buscador y contador */}
            {tab !== "preatencion" && (
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
                        Total {tab === "virtual" ? "Virtuales" : "Registrados"}: {pacientesFiltrados.length}
                    </div>
                </div>
            )}

            {/* ==================== TABLA DE PACIENTES ==================== */}
            {tab !== "preatencion" && (
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
                                            <p className="text-3xl mb-2">{tab === "virtual" ? "💻" : "👤"}</p>
                                            <p className="font-semibold">
                                                {tab === "virtual" ? "No hay pacientes virtuales registrados" : "No se encontraron pacientes presenciales"}
                                            </p>
                                            {tab === "virtual" ? (
                                                <p className="text-xs text-slate-500 mt-1">Las solicitudes del portal pre-atención aparecerán en la pestaña «Pre-Atención» para convertirlas en pacientes</p>
                                            ) : (
                                                <Link href="/dashboard/pacientes/nuevo" className="btn-primary text-xs mt-3 inline-flex">
                                                    + Registrar Primer Paciente
                                                </Link>
                                            )}
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
                                                        <div className="text-[0.7rem] text-slate-500">
                                                            {p.profesion || "Trabajador"}
                                                            {esVirtual(p) && <span className="ml-1.5 text-purple-600 font-semibold">· Telemedicina</span>}
                                                        </div>
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
                                                    title="Enviar WhatsApp de Pre-Atención (con datos prellenados)"
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
                                                    title="Subir Nuevo Archivo"
                                                >
                                                    📁 Subir
                                                </button>
                                                {pacientesConArchivos[p.id] && (
                                                    <button
                                                        onClick={() => verUltimoArchivo(p.id)}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg text-xs font-semibold animate-scale-in"
                                                        title="Visualizar Archivo más reciente"
                                                    >
                                                        👁️ Ver PDF
                                                    </button>
                                                )}
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
            )}

            {/* ==================== TABLA DE SOLICITUDES PRE-ATENCIÓN ==================== */}
            {tab === "preatencion" && (
                <div className="section-premium overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50/50">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📥</span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Solicitudes de Pre-Atención (Telemedicina)</h3>
                                <p className="text-[0.7rem] text-slate-500">
                                    Pacientes que diligenciaron el portal y adjuntaron sus documentos. Revise y registre como paciente virtual.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Paciente</th>
                                    <th>Documentos</th>
                                    <th>Contacto</th>
                                    <th>Estado</th>
                                    <th className="text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {solicitudes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-slate-400">
                                            <p className="text-3xl mb-2">📥</p>
                                            <p className="font-semibold">No hay solicitudes de pre-atención</p>
                                            <p className="text-xs text-slate-500 mt-1">Comparta el enlace del portal con sus pacientes para recibirlas aquí</p>
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudes.map((s) => (
                                        <tr key={s.id}>
                                            <td>
                                                <div className="font-bold text-slate-900 text-sm">{s.paciente_nombre}</div>
                                                <div className="text-xs text-slate-500">CC {s.paciente_cedula}</div>
                                            </td>
                                            <td>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {s.cedula_foto_url && <span className="badge badge-slate text-[0.65rem]">🪪 Cédula</span>}
                                                    {s.firma_foto_url && <span className="badge badge-slate text-[0.65rem]">✍️ Firma</span>}
                                                    {(s.examenes_urls?.length || 0) > 0 && <span className="badge badge-slate text-[0.65rem]">📄 {s.examenes_urls.length} examen(es)</span>}
                                                    {s.comprobante_pago_url && <span className="badge badge-slate text-[0.65rem]">💳 Pago</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="text-xs text-slate-700">📱 {s.paciente_telefono || "N/R"}</div>
                                                <div className="text-[0.65rem] text-slate-500">✉️ {s.correo_electronico || "N/R"}</div>
                                            </td>
                                            <td>
                                                <span className={`badge ${estadoSolicitudStyle(s.estado)}`}>
                                                    {s.estado === "completada" ? "Por registrar" : s.estado === "procesada" ? "Convertida en paciente" : s.estado}
                                                </span>
                                            </td>
                                            <td className="text-right space-x-1 whitespace-nowrap">
                                                <button
                                                    onClick={() => {
                                                        setSolicitudSeleccionada(s);
                                                        setModalSolicitudOpen(true);
                                                    }}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold"
                                                    title="Ver detalle y documentos"
                                                >
                                                    👁️ Ver
                                                </button>
                                                {s.estado !== "procesada" && (
                                                    <button
                                                        onClick={() => registrarSolicitudComoPaciente(s)}
                                                        disabled={registrandoPaciente}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold disabled:opacity-50"
                                                        title="Crear paciente virtual con estos datos y documentos"
                                                    >
                                                        ✅ Registrar Paciente
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => enviarWhatsAppSolicitud(s)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg text-xs font-semibold"
                                                    title="Enviar recordatorio por WhatsApp"
                                                >
                                                    📲 Recordar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                                    {esVirtual(pacienteSeleccionado) && (
                                        <p className="text-[0.65rem] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 inline-block mt-1">
                                            💻 Paciente Telemedicina
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Fecha Nacimiento</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.fecha_nacimiento || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Género</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.genero || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Estado Civil</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.estado_civil || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Nivel Educativo</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.escolaridad || "N/R"}</p>
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
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Residencia / Dirección</p>
                                    <p className="font-bold text-slate-800">{pacienteSeleccionado.lugar_residencia || pacienteSeleccionado.direccion || "N/R"}</p>
                                </div>
                                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                                    <p className="text-slate-400 font-semibold uppercase text-[0.65rem]">Cargo a desempeñar</p>
                                    <p className="font-bold text-purple-700">{pacienteSeleccionado.profesion || "N/R"}</p>
                                </div>
                                {pacienteSeleccionado.firma_url && (
                                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1">
                                        <p className="text-emerald-500 font-semibold uppercase text-[0.65rem]">Firma capturada</p>
                                        <img src={pacienteSeleccionado.firma_url} alt="Firma del paciente" className="h-10 object-contain" />
                                    </div>
                                )}
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

            {/* MODAL DETALLE SOLICITUD PRE-ATENCIÓN */}
            {modalSolicitudOpen && solicitudSeleccionada && (
                <div className="modal-overlay" onClick={() => setModalSolicitudOpen(false)}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📥</span>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Solicitud de Pre-Atención</h3>
                                    <p className="text-xs text-slate-500">Documentos y datos enviados por el paciente</p>
                                </div>
                            </div>
                            <button onClick={() => setModalSolicitudOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div>
                                    <h4 className="font-bold text-slate-900">{solicitudSeleccionada.paciente_nombre}</h4>
                                    <p className="text-xs text-slate-500">CC {solicitudSeleccionada.paciente_cedula} · {solicitudSeleccionada.genero || "N/R"} · {solicitudSeleccionada.fecha_nacimiento || "N/R"}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {solicitudSeleccionada.empresa_nombre ? `🏢 ${solicitudSeleccionada.empresa_nombre}` : ""}
                                        {solicitudSeleccionada.cargo ? ` · ${solicitudSeleccionada.cargo}` : ""}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        EPS: {solicitudSeleccionada.eps || "N/R"} · ARL: {solicitudSeleccionada.arl || "N/R"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        📱 {solicitudSeleccionada.paciente_telefono || "N/R"} · ✉️ {solicitudSeleccionada.correo_electronico || "N/R"}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        📍 {solicitudSeleccionada.lugar_residencia || "N/R"} · {solicitudSeleccionada.direccion || ""}
                                    </p>
                                </div>
                                <span className={`badge ${estadoSolicitudStyle(solicitudSeleccionada.estado)}`}>
                                    {solicitudSeleccionada.estado === "completada" ? "Por registrar" : solicitudSeleccionada.estado}
                                </span>
                            </div>

                            {/* Documentos adjuntos */}
                            <div>
                                <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Documentos adjuntados</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {solicitudSeleccionada.cedula_foto_url && (
                                        <a href={urlPublicaBiometria(solicitudSeleccionada.cedula_foto_url) ?? undefined} target="_blank" rel="noreferrer"
                                           className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-3">
                                            <span className="text-2xl">🪪</span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Cédula de Ciudadanía</p>
                                                <p className="text-[0.65rem] text-slate-500">Ver imagen adjunta</p>
                                            </div>
                                        </a>
                                    )}
                                    {solicitudSeleccionada.firma_foto_url && (
                                        <a href={urlPublicaBiometria(solicitudSeleccionada.firma_foto_url) ?? undefined} target="_blank" rel="noreferrer"
                                           className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-3">
                                            <span className="text-2xl">✍️</span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Firma manuscrita</p>
                                                <p className="text-[0.65rem] text-slate-500">Ver imagen adjunta</p>
                                            </div>
                                        </a>
                                    )}
                                    {Array.isArray(solicitudSeleccionada.examenes_urls) && solicitudSeleccionada.examenes_urls.map((url: string, i: number) => (
                                        <a key={i} href={urlPublicaBiometria(url) ?? undefined} target="_blank" rel="noreferrer"
                                           className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-3">
                                            <span className="text-2xl">📄</span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Examen adjunto {i + 1}</p>
                                                <p className="text-[0.65rem] text-slate-500">Ver documento</p>
                                            </div>
                                        </a>
                                    ))}
                                    {solicitudSeleccionada.comprobante_pago_url && (
                                        <a href={urlPublicaBiometria(solicitudSeleccionada.comprobante_pago_url) ?? undefined} target="_blank" rel="noreferrer"
                                           className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-3">
                                            <span className="text-2xl">💳</span>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Comprobante de pago</p>
                                                <p className="text-[0.65rem] text-slate-500">Ver imagen adjunta</p>
                                            </div>
                                        </a>
                                    )}
                                    {!solicitudSeleccionada.cedula_foto_url && !solicitudSeleccionada.firma_foto_url && (solicitudSeleccionada.examenes_urls?.length || 0) === 0 && !solicitudSeleccionada.comprobante_pago_url && (
                                        <p className="text-xs text-slate-400 col-span-2">No se adjuntaron documentos.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
                            <button onClick={() => enviarWhatsAppSolicitud(solicitudSeleccionada)} className="btn-secondary text-xs py-1.5">
                                📲 Recordatorio WhatsApp
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setModalSolicitudOpen(false)} className="btn-secondary text-xs py-1.5">
                                    Cerrar
                                </button>
                                {solicitudSeleccionada.estado !== "procesada" && (
                                    <button
                                        onClick={() => registrarSolicitudComoPaciente(solicitudSeleccionada)}
                                        disabled={registrandoPaciente}
                                        className="btn-primary text-xs py-1.5"
                                    >
                                        {registrandoPaciente ? "Registrando..." : "✅ Registrar como Paciente Virtual"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PREVISUALIZADOR */}
            {previewModalOpen && previewUrl && (
                <div className="modal-overlay z-[70]" onClick={() => setPreviewModalOpen(false)}>
                    <div className="fixed top-2 bottom-2 left-2 right-2 md:top-4 md:bottom-4 md:left-8 md:right-8 max-w-7xl mx-auto bg-white flex flex-col overflow-hidden shadow-2xl rounded-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-3 sm:p-4 bg-slate-900 text-white shadow-md z-10 shrink-0">
                            <h3 className="font-semibold text-sm">Visualizador de Documentos</h3>
                            <div className="flex gap-4">
                                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white text-sm font-medium flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    Abrir externo
                                </a>
                                <button onClick={() => setPreviewModalOpen(false)} className="text-slate-300 hover:text-white font-bold px-2">✕ Cerrar</button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 relative">
                            {previewType === 'pdf' ? (
                                <iframe src={`${previewUrl}#toolbar=0&navpanes=0`} className="absolute inset-0 w-full h-full bg-white" title="PDF Preview" />
                            ) : (
                                <div className="absolute inset-0 p-4 flex items-center justify-center">
                                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg rounded-xl border border-slate-300" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
