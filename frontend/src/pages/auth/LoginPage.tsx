import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  KeyRound,
} from 'lucide-react';
import nbeLogo from '../../assets/branding/National_Bank_of_Egypt.svg.webp';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Return to intended page or redirect to role-specific dashboard
  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);

      const getRoleDashboard = (userRole: string) => {
        switch (userRole) {
          case 'USER':
            return '/owner/dashboard';
          case 'CHECKER':
            return '/checker/dashboard';
          case 'ADMIN':
            return '/admin/dashboard';
          default:
            return '/';
        }
      };

      const isPathAllowed = (path: string, userRole: string) => {
        if (!path || path === '/login' || path === '/unauthorized' || path === '/overview' || path === '/') {
          return false;
        }
        if (path.startsWith('/user/') && userRole !== 'USER') return false;
        if (path.startsWith('/checker/') && userRole !== 'CHECKER') return false;
        if (path.startsWith('/admin/') && userRole !== 'ADMIN') return false;
        return true;
      };

      if (fromLocation && isPathAllowed(fromLocation, user.role)) {
        navigate(fromLocation, { replace: true });
      } else {
        navigate(getRoleDashboard(user.role), { replace: true });
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col font-sans">
      {/* ── Main Branding Header ── */}
      <header className="bg-white border-b border-[#E8E8E8] shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={nbeLogo}
              alt="National Bank of Egypt"
              className="h-12 w-auto object-contain"
            />
            <div className="h-8 w-px bg-[#E0E0E0] hidden sm:block" />
            <div>
              <p className="text-[11px] font-semibold text-[#00693E] tracking-wider uppercase">
                البنك الأهلي المصري
              </p>
              <h1 className="text-sm font-bold text-[#1A1A1A] leading-tight">
                Policy &amp; Rules Lifecycle Management System
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#555555]">
            <KeyRound className="w-4 h-4 text-[#F7941D]" />
            <span className="font-medium">Enterprise Authentication Gateway</span>
          </div>
        </div>
      </header>

      {/* ── Center Login Area ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-[#E8E8E8] shadow-nbe-card rounded-2xl overflow-hidden">
          
          {/* Card Header Strip — NBE Green */}
          <div className="bg-[#00693E] px-6 py-4 text-white">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#F7941D]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#FDE4BF]">
                Four-Eyes Governance Portal
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Staff Secure Sign-In</h2>
            <p className="text-xs text-[#D0EDDF]">
              National Bank of Egypt • Internal Policy System
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Error Message Display */}
            {errorMessage && (
              <div className="bg-[#FDEDEC] border border-[#FADBD8] p-3 rounded-xl flex items-start gap-2.5 text-[#C0392B] animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold">Authentication Failed: </span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#333333] mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. name@nbe.com.eg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#333333]">
                    Portal Password
                  </label>
                  <span className="text-[11px] text-[#00693E] hover:underline cursor-pointer">
                    Forgot Password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#FAFAFA] border border-[#D0D0D0] rounded-xl text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:border-[#00693E] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-[#00693E] hover:bg-[#005C36] text-white font-bold text-xs flex items-center justify-center gap-2 rounded-xl transition-all shadow-sm disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Policy Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card Footer Security Disclaimer */}
          <div className="bg-[#F8F8F8] px-6 py-3 border-t border-[#E8E8E8] text-center text-[10px] text-[#888888]">
            Internal Banking System • Access restricted to authorized personnel
          </div>
        </div>
      </div>

      {/* ── Minimal Clean Corporate Footer ── */}
      <footer className="bg-[#00693E] py-3 mt-auto">
        <p className="text-center text-white text-[11px] font-medium">
          © {new Date().getFullYear()} National Bank of Egypt. All rights reserved. &nbsp;|&nbsp; البنك الأهلي المصري
        </p>
      </footer>
    </div>
  );
};
