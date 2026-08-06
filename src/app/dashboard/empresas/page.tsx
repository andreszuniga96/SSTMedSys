"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import LoadingState from "@/components/dashboard/LoadingState";

export default function EmpresasPage() {
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    // Modal crear/editar
    const [modalOpen, setModalOpen] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: "",
        nit: "",
        sector: "",
        direccion: "",
        ciudad: "Pasto - Nariño",
        telefono: "",
        correo_contacto: "",
        nombre_contacto: "",
        arl_contratante: "",
    });

    const cargar = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("empresas")
                .select("*")
                .order("nombre", { ascending: true });
            if (error) throw error;
            setEmpresas(data || []);
        } catch (err: any) {
            console.error("Error cargando empresas:", err);
            toast.error(`Error cargando empresas: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
    }, []);

    const abrirNueva = () => {
        setEditandoId(null);
        setForm({
            nombre: "",
            nit: "",
            sector: "",
            direccion: "",
            ciudad: "Pasto - Nariño",
            telefono: "",
            correo_contacto: "",
            nombre_contacto: "",
            arl_contratante: "",
        });
        setModalOpen(true);
    };

    const abrirEditar = (e: any) => {
        setEditandoId(e.id);
        setForm({
            nombre: e.nombre || "",
            nit: e.nit || "",
            sector: e.sector || "",
            direccion: e.direccion || "",
            ciudad: e.ciudad || "Pasto - Nariño",
            telefono: e.telefono || "",
            correo_contacto: e.correo_contacto || "",
            nombre_contacto: e.nombre_contacto || "",
            arl_contratante: e.arl_contratante || "",
        });
        setModalOpen(true);
    };

    const guardar = async () => {
        if (!form.nombre.trim()) return toast.error("El nombre de la empresa es obligatorio.");
        setGuardando(true);
        try {
            const supabase = createClient();
            // Normalizar: strings vacíos → null (evita violar UNIQUE del NIT con "")
            const payload: Record<string, any> = {};
            (Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
                const v = form[k];
                payload[k] = typeof v === "string" && v.trim() === "" ? null : v;
            });
            if (editandoId) {
                const { error } = await supabase.from("empresas").update(payload).eq("id", editandoId);
                if (error) throw error;
                toast.success("Empresa actualizada.");
            } else {
                const { error } = await supabase.from("empresas").insert(payload);
                if (error) throw error;
                toast.success("Empresa registrada.");
            }
            setModalOpen(false);
            cargar();
        } catch (err: any) {
            console.error("Error guardando empresa:", err);
            if (err?.code === "23505") {
                toast.error("Ya existe una empresa registrada con ese NIT.");
            } else {
                toast.error(`Error: ${err.message}`);
            }
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (empresa: any) => {
        if (!confirm(`¿Eliminar la empresa "${empresa.nombre}"? Sus exámenes históricos se conservarán.`)) return;
        try {
            const supabase = createClient();
            const { error } = await supabase.from("empresas").delete().eq("id", empresa.id);
            if (error) throw error;
            toast.success("Empresa eliminada.");
            cargar();
        } catch (err: any) {
            console.error("Error eliminando empresa:", err);
            toast.error(`Error: ${err.message}`);
        }
    };

    const filtradas = empresas.filter((e) => {
        const t = busqueda.toLowerCase();
        return (
            e.nombre?.toLowerCase().includes(t) ||
            e.nit?.toLowerCase().includes(t) ||
            e.ciudad?.toLowerCase().includes(t) ||
            e.arl_contratante?.toLowerCase().includes(t)
        );
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                icono={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                }
                titulo="Empresas"
                subtitulo="Clientes contratantes y su historial de exámenes ocupacionales"
                acciones={
                    <button onClick={abrirNueva} className="btn-primary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Empresa
                    </button>
                }
            />

            {/* Buscador */}
            <div className="relative w-full md:w-96">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="input-premium pl-10"
                    placeholder="Buscar por nombre, NIT, ciudad o ARL..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            {/* Grid de empresas */}
            {loading ? (
                <LoadingState texto="Cargando empresas..." />
            ) : filtradas.length === 0 ? (
                <div className="section-premium p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-teal-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <p className="font-semibold text-slate-800">No hay empresas registradas</p>
                    <p className="text-xs text-slate-500 mt-1">Registre la primera empresa contratante para asociar sus exámenes.</p>
                    <button onClick={abrirNueva} className="btn-primary text-xs mt-4 inline-flex">
                        + Registrar Empresa
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtradas.map((e) => (
                        <div key={e.id} className="card-premium p-5 flex flex-col hover:shadow-lg hover:border-teal-300 transition-all duration-300 group">
                            <div className="flex items-start justify-between gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                                    {e.nombre?.charAt(0).toUpperCase() || "E"}
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold ${e.estado === "inactiva" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                                    {e.estado === "inactiva" ? "Inactiva" : "Activa"}
                                </span>
                            </div>
                            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-teal-700 transition-colors">{e.nombre}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">NIT: {e.nit || "—"}</p>
                            <div className="mt-3 space-y-1.5 text-xs text-slate-600 flex-1">
                                {e.ciudad && <p>📍 {e.ciudad}</p>}
                                {e.telefono && <p>📞 {e.telefono}</p>}
                                {e.arl_contratante && (
                                    <p className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold">
                                        ARL: {e.arl_contratante}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                <Link
                                    href={`/dashboard/empresas/${e.id}`}
                                    className="flex-1 text-center px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Ver historial →
                                </Link>
                                <button
                                    onClick={() => abrirEditar(e)}
                                    className="px-3 py-2 border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 text-xs font-bold rounded-lg transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => eliminar(e)}
                                    className="px-3 py-2 border border-slate-200 hover:border-red-400 text-slate-600 hover:text-red-600 text-xs font-bold rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal crear/editar */}
            <Modal
                abierto={modalOpen}
                onCerrar={() => setModalOpen(false)}
                titulo={editandoId ? "Editar Empresa" : "Nueva Empresa"}
                footer={
                    <>
                        <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} disabled={guardando} className="btn-primary">
                            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar empresa"}
                        </button>
                    </>
                }
            >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="label-premium">Nombre *</label>
                                <input className="input-premium" placeholder="Ej. AMPM24 SAS" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">NIT</label>
                                <input className="input-premium" placeholder="Ej. 900813532" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Sector</label>
                                <input className="input-premium" placeholder="Ej. Educación" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Ciudad</label>
                                <input className="input-premium" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Teléfono</label>
                                <input className="input-premium" placeholder="Ej. 3120000000" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Contacto</label>
                                <input className="input-premium" placeholder="Nombre del representante" value={form.nombre_contacto} onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-premium">Correo de contacto</label>
                                <input className="input-premium" placeholder="contacto@empresa.com" value={form.correo_contacto} onChange={(e) => setForm({ ...form, correo_contacto: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-premium">Dirección</label>
                                <input className="input-premium" placeholder="Dirección de la sede principal" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-premium">ARL contratante</label>
                                <select className="select-premium" value={form.arl_contratante} onChange={(e) => setForm({ ...form, arl_contratante: e.target.value })}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Positiva">Positiva</option>
                                    <option value="Sura">Sura</option>
                                    <option value="Colmena">Colmena</option>
                                    <option value="Axa Colpatria">Axa Colpatria</option>
                                    <option value="Seguros Bolívar">Seguros Bolívar</option>
                                    <option value="Liberty">Liberty</option>
                                    <option value="Equidad">Equidad</option>
                                </select>
                            </div>
                </div>
            </Modal>
        </div>
    );
}
