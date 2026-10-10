import React, { useState } from 'react';
import {
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  User,
  Shield,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { ThemeConfig } from './theme';
import { safePost } from './api';

export interface UserAccount {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  provider: 'google' | 'outlook' | 'email' | 'phone';
  role: 'developer' | 'user';
  createdAt: string;
}

interface AuthModalProps {
  t: ThemeConfig;
  isOpen: boolean;
  currentUser: UserAccount | null;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  onLogout: () => void;
}

export function AuthModal({
  t,
  isOpen,
  currentUser,
  onClose,
  onLoginSuccess,
  onLogout,
}: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [method, setMethod] = useState<'google' | 'outlook' | 'email' | 'phone'>('google');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  
  // Verification code stage (for phone/email simulation)
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verifyCode, setVerifyCode] = useState('');
  const [sentCodeNotice, setSentCodeNotice] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Quick 1-click Google or Outlook sign-in
  const handleOAuthSignIn = async (provider: 'google' | 'outlook') => {
    setLoading(true);
    setError('');
    try {
      const res = await safePost<{ success: boolean; user: UserAccount }>('/api/user/oauth', {
        provider,
      });
      if (res?.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(`Failed to sign in with ${provider}.`);
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Submit email/password or phone
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (method === 'phone') {
        if (!phone.trim()) {
          setError('Please provide your phone number.');
          setLoading(false);
          return;
        }
        // Send SMS OTP code
        const res = await safePost<{ success: boolean; message: string }>('/api/user/send-otp', {
          phone,
          purpose: 'signin_signup',
        });
        if (res?.success) {
          setSentCodeNotice(`Verification code sent to ${phone}. Check your SMS/WhatsApp.`);
          setStep('verify');
        } else {
          setError('Failed to send verification SMS.');
        }
      } else {
        // Email / password
        if (!email.trim() || !password.trim()) {
          setError('Please enter your email and password.');
          setLoading(false);
          return;
        }
        const endpoint = tab === 'signin' ? '/api/user/login' : '/api/user/signup';
        const res = await safePost<{ success: boolean; user: UserAccount; error?: string }>(endpoint, {
          email,
          password,
          name: name.trim() || email.split('@')[0],
        });
        if (res?.success && res.user) {
          onLoginSuccess(res.user);
          onClose();
        } else {
          setError(res?.error || 'Authentication failed. Please verify credentials.');
        }
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      setError('Please enter the verification code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await safePost<{ success: boolean; user: UserAccount }>('/api/user/verify-otp', {
        phone,
        code: verifyCode,
        name: name.trim() || `User ${phone.slice(-4)}`,
      });
      if (res?.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError('Invalid verification code.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`w-full max-w-md ${t.card} border ${t.cardBorder} rounded-2xl p-6 shadow-2xl relative my-auto space-y-5 animate-in fade-in zoom-in-95 duration-150`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-xl ${t.cardSub} ${t.textMuted} hover:text-white transition`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {currentUser ? 'Your RARE Account' : tab === 'signin' ? 'Sign In to RARE' : 'Create RARE Account'}
            </h2>
            <p className={`text-xs ${t.textMuted}`}>
              {currentUser
                ? 'Logged in with cloud sync & workspace backup'
                : 'Free normal access or sign in to sync all memory & models'}
            </p>
          </div>
        </div>

        {/* If user is already logged in, show profile card & logout */}
        {currentUser ? (
          <div className="space-y-4 pt-2">
            <div className={`p-4 rounded-xl ${t.cardSub} border ${t.cardBorder} space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Account Name</span>
                <span className="text-xs font-semibold text-white">{currentUser.name}</span>
              </div>
              {currentUser.email && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Email</span>
                  <span className="text-xs font-mono text-indigo-300">{currentUser.email}</span>
                </div>
              )}
              {currentUser.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Phone</span>
                  <span className="text-xs font-mono text-emerald-300">{currentUser.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Provider</span>
                <span className="text-xs capitalize font-medium text-slate-200">{currentUser.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Account Type</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentUser.role === 'developer' ? 'Verified Developer' : 'Standard User'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-medium ${t.cardSub} ${t.textMuted} border ${t.cardBorder}`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab: Sign In vs Sign Up */}
            <div className={`grid grid-cols-2 p-1 rounded-xl ${t.cardSub} border ${t.cardBorder}`}>
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setStep('form');
                  setError('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  tab === 'signin' ? `${t.accentBg} text-white shadow-xs` : `${t.textMuted} hover:text-white`
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setStep('form');
                  setError('');
                }}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  tab === 'signup' ? `${t.accentBg} text-white shadow-xs` : `${t.textMuted} hover:text-white`
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Quick 1-Click Providers (Google & Outlook) */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Sign In</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 12s.7 2.3 1.9 4.7l3.7-1.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Google Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('outlook')}
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#0078D4" d="M11.5 2H2v10.5h9.5V2z" />
                    <path fill="#0078D4" d="M22 2h-9.5v10.5H22V2z" />
                    <path fill="#0078D4" d="M11.5 13.5H2V22h9.5v-8.5z" />
                    <path fill="#0078D4" d="M22 13.5h-9.5V22H22v-8.5z" />
                  </svg>
                  <span>Outlook Account</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 my-2">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] uppercase font-semibold text-slate-500">Or use Email / Phone</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Choose between Email or Phone number */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setStep('form');
                  setError('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 border transition ${
                  method === 'email'
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : `${t.cardSub} border-transparent ${t.textMuted}`
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Any Email Address</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setStep('form');
                  setError('');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 border transition ${
                  method === 'phone'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : `${t.cardSub} border-transparent ${t.textMuted}`
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone Number</span>
              </button>
            </div>

            {/* Form */}
            {step === 'form' ? (
              <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
                {tab === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Hunter"
                      className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2 text-xs focus:outline-none`}
                    />
                  </div>
                )}

                {method === 'phone' ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Phone Number (with Country Code)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000 or +1 (555)..."
                      className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2 text-xs focus:outline-none`}
                    />
                    <p className="text-[10px] text-slate-500">
                      We'll send an instant verification code to this phone number.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com or any email"
                        className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2 text-xs focus:outline-none`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password..."
                          className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2 pr-10 text-xs focus:outline-none`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md transition`}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            // Eye Open
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            // Eye Closed / Slashed
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 rounded-xl text-xs font-medium ${t.cardSub} ${t.textMuted} border ${t.cardBorder}`}
                  >
                    Continue as Guest
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold ${t.accentBg} ${t.accentBgHover} text-white flex items-center space-x-1.5 shadow-md disabled:opacity-50`}
                  >
                    <span>{loading ? 'Processing...' : method === 'phone' ? 'Send Code' : tab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              /* Verification Stage */
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 pt-1">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  {sentCodeNotice || `Enter the 6-digit verification code sent to ${phone}`}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">6-Digit Code</label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="Enter code (e.g. 749201)..."
                    maxLength={8}
                    className={`w-full ${t.inputBg} border ${t.inputBorder} rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest focus:outline-none`}
                  />
                  <p className="text-[10px] text-slate-400">
                    Test hint: Any 6 digits or SMS code works instantly.
                  </p>
                </div>

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setError('');
                    }}
                    className={`text-xs ${t.textMuted} hover:text-white underline`}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !verifyCode.trim()}
                    className={`px-5 py-2 rounded-xl text-xs font-semibold ${t.accentBg} ${t.accentBgHover} text-white flex items-center space-x-1.5 shadow-md disabled:opacity-50`}
                  >
                    <span>{loading ? 'Verifying...' : 'Complete Sign In'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
