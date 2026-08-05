"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message === "Invalid login credentials"
                ? "Credenciales incorrectas. Verifique su correo y contraseña."
                : error.message
            );
            setLoading(false);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
            
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, var(--primary-400), transparent)' }} />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, var(--accent-400), transparent)' }} />
                <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-5 animate-float"
                    style={{ background: 'radial-gradient(circle, var(--primary-300), transparent)' }} />
            </div>

            <div className="relative w-full max-w-md mx-4 animate-scale-in">
                {/* Card */}
                <div className="backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
                    style={{ background: 'rgba(30, 41, 59, 0.7)', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}>
                    
                    {/* Header */}
                    <div className="px-8 pt-10 pb-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))', boxShadow: '0 8px 24px rgb(37 99 235 / 0.3)' }}>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">SST MedSys</h1>
                        <p className="text-sm text-slate-400 mt-2">Sistema de Gestión en Seguridad y Salud en el Trabajo</p>
                    </div>

                    {/* Form */}
                    <div className="px-8 pb-10">
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="email-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-600/50 bg-slate-800/60 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                        placeholder="doctora@sstmedsys.com"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="password-input"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-600/50 bg-slate-800/60 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-red-300">{error}</span>
                                </div>
                            )}

                            <button
                                id="login-button"
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: loading
                                        ? 'rgb(59 130 246 / 0.5)'
                                        : 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                                    boxShadow: loading ? 'none' : '0 4px 16px rgb(37 99 235 / 0.3)',
                                }}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Verificando credenciales...
                                    </span>
                                ) : (
                                    "Ingresar al Sistema"
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-[0.7rem] text-slate-500">
                                Acceso exclusivo para personal médico autorizado
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer branding */}
                <div className="text-center mt-6">
                    <p className="text-xs text-slate-600">
                        SST MedSys v1.0 · Resolución 2346/2007 · Decreto 1072/2015
                    </p>
                </div>
            </div>
        </div>
    );
}