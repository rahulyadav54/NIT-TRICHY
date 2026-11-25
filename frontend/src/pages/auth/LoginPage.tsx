import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { User } from '@/types';
import {
  Factory, Mail, Lock, ArrowRight, ShieldCheck, SlidersHorizontal,
  Gauge, TrendingUp, BookOpen, AlertCircle, Eye, EyeOff, Check,
  BarChart3, FileText, Building2,
} from 'lucide-react';

const DEMO_ROLES = [
  { role: 'OWNER', shortRole: 'OWNER', label: 'Plant Director (Owner)', email: 'owner@trima.com', Icon: ShieldCheck },
  { role: 'ADMIN', shortRole: 'ADMIN', label: 'Operations Admin', email: 'admin@trima.com', Icon: SlidersHorizontal },
  { role: 'PRODUCTION_SUPERVISOR', shortRole: 'PRODU', label: 'Production Supervisor', email: 'production@trima.com', Icon: Gauge },
  { role: 'SALESMAN', shortRole: 'SALES', label: 'Field Sales Executive', email: 'salesman@trima.com', Icon: TrendingUp },
  { role: 'ACCOUNTANT_AUDITOR', shortRole: 'ACCOU', label: 'Statutory Auditor', email: 'auditor@trima.com', Icon: BookOpen },
];

const HERO_STATS = [
  { value: '4 Active', label: 'Production Lines', Icon: Factory },
  { value: '100%', label: 'GST Compliance', Icon: ShieldCheck },
  { value: '94.2%', label: 'Avg Yield OEE', Icon: BarChart3 },
  { value: 'Full Log', label: 'Audit Trail', Icon: FileText },
];

function TrimaEmblem({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="url(#trimaBadge)" />
      <path
        d="M20 9.5L22.2 11.4L25.1 11L26.2 13.7L28.9 14.8L28.5 17.7L30.5 19.9L28.5 22.1L28.9 25L26.2 26.1L25.1 28.8L22.2 28.4L20 30.3L17.8 28.4L14.9 28.8L13.8 26.1L11.1 25L11.5 22.1L9.5 19.9L11.5 17.7L11.1 14.8L13.8 13.7L14.9 11L17.8 11.4L20 9.5Z"
        stroke="#38BDF8"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="4.5" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M18.2 21.8C19.6 18.8 22.2 17.1 25 16.5C24.5 19.3 22.8 21.7 19.8 22.8" stroke="#34D399" strokeWidth="1.7" strokeLinecap="round" />
      <defs>
        <linearGradient id="trimaBadge" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#0891B2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const remembered = typeof window !== 'undefined' ? localStorage.getItem('trima_remembered_email') : null;
  const [email, setEmail] = useState(remembered || 'owner@trima.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(Boolean(remembered));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (rememberEmail) {
        localStorage.setItem('trima_remembered_email', email);
      } else {
        localStorage.removeItem('trima_remembered_email');
      }

      const res = await apiRequest<{ success: boolean; token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success) {
        login(res.token, res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between bg-[#08132B]">
      {/* Realistic Food Manufacturing Background + Deep Navy Gradient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/factory-bg.jpg')" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(108deg, rgba(7, 17, 40, 0.95) 0%, rgba(10, 26, 62, 0.86) 48%, rgba(14, 38, 92, 0.78) 100%)',
        }}
      />
      {/* Subtle Ambient Cyan / Royal Blue Depth */}
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-[480px] h-[480px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -top-24 right-1/4 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
      />

      {/* Top Navigation / Status Header */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-5 sm:pt-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <TrimaEmblem size={40} />
          <div>
            <div className="text-white font-bold text-lg sm:text-xl tracking-tight leading-none">
              TRIMA <span className="text-cyan-400">ERP</span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase mt-1">
              Manufacturing &amp; Audit
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 pl-4 ml-2 border-l border-white/15 text-[11px] font-medium tracking-[0.2em] text-slate-300/90 uppercase">
            PLAN <span className="text-cyan-400">•</span> PRODUCE <span className="text-cyan-400">•</span> TRACK <span className="text-cyan-400">•</span> AUDIT
          </div>
        </div>

        {/* Top-Right Informational Status Capsule */}
        <div className="hidden sm:inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0A193A]/70 border border-blue-400/30 backdrop-blur-md text-xs text-slate-100 shadow-sm">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-cyan-400" />
            GST Compliant
          </span>
          <span className="text-blue-400/40">|</span>
          <span className="text-slate-200">Audit Ready</span>
          <span className="text-blue-400/40">|</span>
          <span className="text-cyan-300 font-medium">Enterprise Grade</span>
        </div>
      </header>

      {/* Main Two-Column Composition */}
      <main className="relative z-10 flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-6 lg:py-8 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        {/* LEFT SIDE (55-60% Desktop) — Hero & Enterprise Stats */}
        <section className="w-full lg:w-[57%] flex flex-col justify-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] font-extrabold text-white leading-[1.12] tracking-tight">
            Enterprise-Grade
            <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400 bg-clip-text text-transparent mt-1">
              Manufacturing ERP
            </span>
          </h1>

          <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-[17px] text-slate-200/90 leading-relaxed max-w-[580px]">
            A unified platform for production, compliance, inventory, sales and audits — built for Trichy&apos;s food processing sector.
          </p>

          {/* Short Cyan Accent Line */}
          <div className="mt-4 w-12 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />

          {/* Four Enterprise Stat Cards */}
          <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-[680px]">
            {HERO_STATS.map(({ value, label, Icon }) => (
              <div
                key={label}
                className="group rounded-2xl bg-[#0D2149]/65 hover:bg-[#112A5C]/80 border border-blue-400/25 hover:border-cyan-400/50 backdrop-blur-md p-3.5 sm:p-4 text-center transition-all duration-200 hover:-translate-y-0.5 shadow-lg"
              >
                <div className="mx-auto w-9 h-9 rounded-xl bg-blue-500/15 border border-cyan-400/25 flex items-center justify-center mb-2.5">
                  <Icon size={18} className="text-cyan-300" />
                </div>
                <div className="text-white font-bold text-base sm:text-lg leading-tight">
                  {value}
                </div>
                <div className="text-slate-300/80 text-[11px] sm:text-xs mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RIGHT SIDE (40-45% Desktop) — Enterprise Glassmorphism Login Card */}
        <section className="w-full max-w-[460px] lg:w-[43%] lg:max-w-[490px] flex-shrink-0">
          <div
            className="relative overflow-hidden rounded-[24px] bg-white/95 backdrop-blur-xl border border-blue-200/70 p-6 sm:p-8 shadow-[0_24px_60px_rgba(4,12,34,0.55)]"
          >
            {/* Subtle top-right geometric accent inside card */}
            <div
              className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }}
            />

            {/* Card Header */}
            <div className="relative flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0891B2] flex items-center justify-center shadow-md flex-shrink-0">
                <Factory size={22} className="text-white" />
              </div>
              <div>
                <div className="text-[#0F172A] font-extrabold text-lg leading-none tracking-tight">
                  TRIMA <span className="text-[#2457D6]">ERP</span>
                </div>
                <div className="text-[10px] font-semibold tracking-[0.16em] text-[#64748B] uppercase mt-1">
                  Manufacturing &amp; Audit
                </div>
              </div>
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-bold text-[#101B33] tracking-tight">
                Sign in to your workspace
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                Enter your authorized credentials to continue.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1E293B] mb-1.5">
                  <Mail size={13} className="text-[#2457D6]" />
                  Authorized Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your work email"
                    className="w-full h-11 pl-10 pr-3.5 text-sm bg-[#F4F7FB] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 focus:border-[#2457D6] text-[#172033] placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1E293B] mb-1.5">
                  <Lock size={13} className="text-[#2457D6]" />
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-11 pl-10 pr-10 text-sm bg-[#F4F7FB] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 focus:border-[#2457D6] text-[#172033] placeholder:text-slate-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2457D6] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Email (backed by localStorage) */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[#475569] font-medium">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2457D6] focus:ring-[#2457D6]"
                  />
                  Remember email
                </label>
              </div>

              {/* Primary CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] flex items-center justify-center gap-2 rounded-xl text-sm sm:text-base font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2457D6]/50"
                style={{
                  background: loading
                    ? '#1D4ED8'
                    : 'linear-gradient(90deg, #1D4ED8 0%, #2457D6 60%, #0284C7 100%)',
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying Credentials...
                  </span>
                ) : (
                  <>
                    <ArrowRight size={17} />
                    <span>Enter Enterprise Workspace</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Role Authentication — NIT Evaluation */}
            <div className="mt-6 pt-5 border-t border-slate-200/80">
              <div className="flex items-center gap-3 mb-3.5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold text-[#64748B] tracking-wide whitespace-nowrap">
                  Quick Role Authentication — NIT Evaluation
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_ROLES.map(({ role, shortRole, label, email: roleEmail, Icon }, idx) => {
                  const isSelected = email === roleEmail;
                  const isAuditor = idx === DEMO_ROLES.length - 1;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setEmail(roleEmail);
                        setPassword('password123');
                        setError(null);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border ${
                        isAuditor ? 'sm:col-span-2' : ''
                      } ${
                        isSelected
                          ? 'bg-blue-50/90 border-[#2457D6] ring-1 ring-[#2457D6]/30 shadow-xs'
                          : 'bg-[#F8FAFC] border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-[#2457D6]/15 text-[#2457D6]' : 'bg-white border border-slate-200 text-[#475569]'
                        }`}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-[#101B33]' : 'text-[#1E293B]'}`}>
                          {label}
                        </div>
                        <div className="text-[10px] font-mono text-[#64748B] mt-0.5">
                          Role: {shortRole}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#2457D6] text-white flex items-center justify-center flex-shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom-Left Demo Identity Footer */}
      <footer className="relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pb-4 sm:pb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-300/80">
          <span className="inline-flex items-center gap-1.5 font-mono">
            <Building2 size={13} className="text-cyan-400" />
            GSTIN: 33AAACT1234F1Z5 (Demo)
          </span>
          <span className="text-slate-500">|</span>
          <span>Trichy Food Products Unit-01</span>
          <span className="text-slate-500">|</span>
          <span>NIT Trichy Internship Demo</span>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
