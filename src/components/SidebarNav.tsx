"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const navItems = [
    {
        href: "/dashboard",
        label: "Panel Principal",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 7a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zm-10-2a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5z" />
            </svg>
        ),
        exact: true,
    },
    {
        href: "/dashboard/pacientes",
        label: "Gestión de Pacientes",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/evaluaciones",
        label: "Evaluaciones Médicas",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/timeline",
        label: "Línea de Tiempo",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/empresas",
        label: "Empresas",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    {
        href: "/dashboard/agenda",
        label: "Agenda de Citas",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        href: "/dashboard/reportes",
        label: "Reportes",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
];

export function SidebarNav({ userEmail }: { userEmail: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        toast.success("Cerrando sesión...");
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : "DR";

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40"
                style={{ background: 'var(--surface-sidebar)' }}>
                <span className="font-bold text-white text-sm tracking-wide">SST MedSys</span>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                    {mobileOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:relative inset-y-0 left-0 z-40
                    ${collapsed ? "w-20" : "w-[17rem]"} flex flex-col
                    transform transition-all duration-300 ease-in-out
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
                `}
                style={{ background: 'var(--surface-sidebar)' }}
            >
                {/* Logo Header */}
                <div className={`h-16 flex items-center ${collapsed ? "justify-center" : "px-5 justify-between"} border-b border-slate-800/60 transition-all`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg"
                            style={{ background: 'linear-gradient(135deg, var(--primary-400), var(--primary-700))', boxShadow: '0 4px 14px rgb(20 184 166 / 0.4)' }}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21s-6.5-4.35-9-8.5C1.5 9.5 3.5 5.5 7 4.5c2.2-.6 4.5.2 5 1 .5-.8 2.8-1.6 5-1 3.5 1 5.5 5 4 8-2.5 4.15-9 8.5-9 8.5z" />
                            </svg>
                        </div>
                        {!collapsed && (
                            <div>
                                <span className="font-bold text-white text-sm tracking-wide block">SST MedSys</span>
                                <span className="text-[0.65rem] text-teal-300/70 font-medium whitespace-nowrap">Salud Ocupacional · CMALAB</span>
                            </div>
                        )}
                    </div>
                    {!collapsed && (
                        <button onClick={() => setCollapsed(true)} className="hidden md:flex text-slate-500 hover:text-white p-1 rounded transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                </div>

                {collapsed && (
                    <button onClick={() => setCollapsed(false)} className="hidden md:flex absolute top-4 -right-3 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1 border border-slate-700 shadow-md z-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto overflow-x-hidden">
                    <p className={`text-[0.65rem] font-semibold text-teal-400/60 uppercase tracking-widest mb-3 transition-all ${collapsed ? "text-center px-0" : "px-3"}`}>
                        {collapsed ? "—" : "Módulos"}
                    </p>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            title={collapsed ? item.label : ""}
                            className={`nav-link ${isActive(item.href, item.exact) ? "nav-link-active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
                        >
                            <div className="shrink-0">{item.icon}</div>
                            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                {/* User Footer */}
                <div className={`p-4 border-t border-slate-800/60 ${collapsed ? "flex flex-col items-center" : ""}`}>
                    <div className={`flex items-center gap-3 mb-3 ${collapsed ? "justify-center" : ""}`}>
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-teal-400/40"
                            style={{ background: 'linear-gradient(135deg, var(--accent-500), var(--accent-600))' }}
                            title={collapsed ? userEmail : ""}
                        >
                            {initials}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">Dra. Viviana Quiróz</div>
                                <div className="text-[0.65rem] text-slate-400 truncate">{userEmail}</div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        title={collapsed ? "Cerrar Sesión" : ""}
                        className={`w-full flex items-center gap-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50 ${collapsed ? "justify-center px-0" : "justify-center px-3"}`}
                    >
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {!collapsed && (loggingOut ? "Saliendo..." : "Cerrar Sesión")}
                    </button>
                </div>
            </aside>

            {/* Mobile spacer */}
            <div className="md:hidden h-14" />
        </>
    );
}
