'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Mail, Key, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  }

  return (
    <div className="animate-fofa-in">
      <main className="max-w-[420px] w-full mx-auto p-6 -mt-16 mb-20">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          
          {/* Top Gold Accent Bar */}
          <div className="h-1.5 bg-[#b08d57] w-full" />

          <div className="p-8">
            {/* Header Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="bg-[#f0f4f8] w-14 h-14 rounded-xl flex items-center justify-center mb-4 text-[#1f2a44]">
                <ShieldCheck size={30} />
              </div>
              <h2 className="text-xl font-bold text-[#1f2a44] tracking-tight">Staff Administration</h2>
              <p className="text-[11px] text-[#b08d57] font-bold uppercase tracking-[0.2em] mt-1">
                Secure Access Portal
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 text-red-700">
                <AlertCircle size={18} />
                <span className="text-[12px] font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="text-xs font-bold text-[#1f2a44] uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <Mail size={14} className="text-[#b08d57]" />
                  Email Address
                </label>
                <input 
                  type="email" 
                  required 
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-3 text-[13px] outline-none focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/10 transition-all"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@fofa.edu" 
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="text-xs font-bold text-[#1f2a44] uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <Key size={14} className="text-[#b08d57]" />
                  Secure Password
                </label>
                <input 
                  type="password" 
                  required 
                  className="w-full bg-[#f8f9fb] border border-gray-200 rounded-lg px-4 py-3 text-[13px] outline-none focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/10 transition-all"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#1f2a44] text-white py-3 rounded-lg font-bold text-[12px] uppercase tracking-[0.15em] transition-all hover:bg-[#141c2f] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                {loading ? 'Verifying Access...' : 'Authenticate'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-50 text-center">
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                Protected by FOFA Information Governance.<br />
                Unauthorized access attempts are logged.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}