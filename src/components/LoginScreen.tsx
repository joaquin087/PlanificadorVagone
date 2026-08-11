import React, { useState } from 'react';
import { ChefHat, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { authenticateUser } from '../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (username: string, token: string, remember: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Por favor ingresa usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUser(cleanUser, cleanPass);
      if (result.success && result.token) {
        onLoginSuccess(cleanUser, result.token, rememberMe);
      } else {
        setErrorMsg(result.error || 'Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocurrió un error al procesar el ingreso.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Background glow & subtle ambient graphics */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/10">
            <ChefHat className="w-9 h-9 text-slate-950" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Planificador Vagone</h1>
          <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mt-1">
            Control de Producción & Fábrica
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Ingresa tus credenciales para acceder a la planificación y recetas.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ej: administrador"
                autoFocus
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl text-sm font-medium text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-2xl text-sm font-medium text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/20 accent-amber-500 cursor-pointer"
              />
              <span>Recordar sesión en este equipo</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="inline-block w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Acceso protegido &mdash; Fábrica de Pastas Vagone</span>
        </div>
      </div>

      {/* Subtle version/organization caption */}
      <p className="text-[11px] text-slate-600 mt-6 text-center">
        Sistema de Planificación de Producción e Insumos &bull; Versión Fábrica 2026
      </p>
    </div>
  );
};
