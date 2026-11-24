import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { User } from '@/types';
import {
  Factory, Mail, Lock, LogIn, ShieldCheck, Settings2, Gauge, TrendingUp, BookOpen, AlertCircle,
} from 'lucide-react';

const DEMO_ROLES = [
  { role: 'OWNER', label: 'Plant Director (Owner)', email: 'owner@trima.com', Icon: ShieldCheck },
  { role: 'ADMIN', label: 'Operations Admin', email: 'admin@trima.com', Icon: Settings2 },
  { role: 'PRODUCTION_SUPERVISOR', label: 'Production Supervisor', email: 'production@trima.com', Icon: Gauge },
  { role: 'SALESMAN', label: 'Field Sales Executive', email: 'salesman@trima.com', Icon: TrendingUp },
  { role: 'ACCOUNTANT_AUDITOR', label: 'Statutory Auditor', email: 'auditor@trima.com', Icon: BookOpen },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@trima.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
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
    <div
      className="min-h-screen flex"
      style={{ background: '#F4F7FB' }}
    >
      {/* Left decorative panel (hidden on small screens) */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-[42%] flex-shrink-0"
        style={{ background: '#101B33' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2457D6] flex items-center justify-center shadow-lg">
            <Factory size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">TRIMA ERP</div>
            <div className="text-[#64748B] text-xs uppercase tracking-wider">Manufacturing & Audit</div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-white text-4xl font-bold leading-tight tracking-tight">
              Enterprise-Grade<br />Manufacturing ERP
            </h1>
            <p className="mt-4 text-[#64748B] text-base leading-relaxed">
              Real-time production telemetry, GST-compliant invoicing, BOM management, and full audit trails — built for Trichy's food processing sector.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Production Lines', value: '4 Active' },
              { label: 'GST Compliance', value: '100%' },
              { label: 'Avg Yield OEE', value: '94.2%' },
              { label: 'Audit Trail', value: 'Full Log' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-4" style={{ background: '#1E293B' }}>
                <div className="text-white font-bold text-xl leading-tight">{stat.value}</div>
                <div className="text-[#64748B] text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[#475569] text-xs">
          <div className="font-mono">GSTIN: 33AAACT1234F1Z5</div>
          <div className="mt-1">Trichy Food Plant Unit-01 • NIT Trichy Internship Demo</div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#101B33] flex items-center justify-center shadow-lg mb-4">
              <Factory size={28} className="text-[#2457D6]" />
            </div>
            <h2 className="text-2xl font-bold text-[#172033]">TRIMA ERP</h2>
            <p className="text-sm text-[#64748B] mt-1">Manufacturing & Audit Platform</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#172033]">Sign in to your workspace</h2>
              <p className="text-sm text-[#64748B] mt-1">Enter your authorized credentials to continue.</p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Authorized Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 focus:border-[#2457D6] text-[#172033] placeholder:text-gray-400 transition-all"
                    placeholder="name@trima.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Passcode / Authentication
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 focus:border-[#2457D6] text-[#172033] transition-all"
                    placeholder="••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                style={{ background: loading ? '#1a3fa8' : '#2457D6' }}
                onMouseEnter={(e) => !loading && ((e.target as HTMLButtonElement).style.background = '#1a3fa8')}
                onMouseLeave={(e) => !loading && ((e.target as HTMLButtonElement).style.background = '#2457D6')}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying credentials...
                  </span>
                ) : (
                  <>
                    <LogIn size={16} />
                    Enter Enterprise Workspace
                  </>
                )}
              </button>
            </form>

            {/* Quick Role Switcher */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-center mb-3">
                Quick Role Authentication — NIT Evaluation
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ROLES.map(({ role, label, email: roleEmail, Icon }) => {
                  const isSelected = email === roleEmail;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => { setEmail(roleEmail); setPassword('password123'); }}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-sm transition-all border ${
                        isSelected
                          ? 'bg-[#2457D6] text-white border-[#2457D6] shadow-sm'
                          : 'bg-gray-50 text-[#172033] border-gray-200 hover:border-[#2457D6]/40 hover:bg-blue-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-white border border-gray-200'}`}>
                        <Icon size={14} className={isSelected ? 'text-white' : 'text-[#2457D6]'} />
                      </div>
                      <span className="font-medium flex-1 truncate">{label}</span>
                      <span className={`text-[10px] font-mono flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}>
                        {role.substring(0, 5)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-[#64748B] mt-6">
            Trichy Food Plant Unit-01 • GSTIN: 33AAACT1234F1Z5
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
