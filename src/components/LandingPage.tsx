import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Languages,
  GraduationCap,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Mic,
  Palette,
  AlertCircle,
} from 'lucide-react';
import { signInWithGoogle } from '../utils/firebase';
import { UserProfile } from '../types';

interface LandingPageProps {
  onAuthSuccess: (profile: UserProfile, isFirstTime: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { profile, isFirstTime } = await signInWithGoogle();
      onAuthSuccess(profile, isFirstTime);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please choose your Google account in the popup to proceed.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('A sign-in window is already open. Please select your account there.');
      } else {
        setError(err.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50 via-white to-amber-50/40 text-neutral-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Simple Brand Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-linear-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center text-2xl shadow-sm select-none">
            🐘
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-neutral-950 font-serif">
                Truncky AI
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                Kids Companion + Teacher AI
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">Truncky ~ Elephant</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="px-4 py-2 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Sign In'}
        </button>
      </header>

      {/* Main Hero & Auth Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14">
        {/* Left: Value Proposition & Visual Story */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-200">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Interactive Tutoring for Classes 1 to 5</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950 font-serif leading-tight">
            Meet <span className="text-indigo-600">Truncky</span>, your child’s voice-enabled elephant teacher.
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Real-time conversational learning with patient explanations, live educational visual diagrams,
            and an automatic parent learning timeline curated to your child’s grade and native languages.
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left max-w-lg mx-auto lg:mx-0">
            <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Live Voice Tutor</h4>
                <p className="text-[11px] text-neutral-500">Low-latency spoken lessons with natural turn-taking.</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Visual Teaching Canvas</h4>
                <p className="text-[11px] text-neutral-500">Auto-drawn diagrams & letter stroke guides on screen.</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Languages className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Multilingual Restriction</h4>
                <p className="text-[11px] text-neutral-500">Converses strictly in your child's selected languages.</p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-900">Parent Timeline</h4>
                <p className="text-[11px] text-neutral-500">Isolated milestones & resume memory per family.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Real Firebase Google Sign-In / Sign-Up Card */}
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-3xl shadow-xl overflow-hidden flex flex-col">
          {/* Header Banner */}
          <div className="bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-700 p-7 text-white text-center relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl mb-3 shadow-inner">
              🐘
            </div>
            <h2 className="text-xl font-bold tracking-tight">Welcome to Truncky AI</h2>
            <p className="text-xs text-indigo-100 mt-1 max-w-xs mx-auto">
              Sign in with your Google Account to unlock your child’s customized learning portal.
            </p>
          </div>

          {/* Action Body */}
          <div className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Primary Real Google Authentication Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3.5 px-5 border-2 border-neutral-200 hover:border-indigo-400 bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-sm rounded-2xl flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all cursor-pointer group disabled:opacity-50"
              >
                {/* Official Google Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Opening Google Account Picker...' : 'Continue with Google'}</span>
                {!loading && <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-indigo-600 transition-colors ml-auto" />}
              </button>

              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-neutral-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Real Google Account Authentication</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  You will choose your personal Google Account in the official Google sign-in prompt.
                  Your lessons, speaking languages, and child’s progress are isolated and private to you.
                </p>
              </div>
            </div>

            {/* Privacy Guarantee */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Protected by Firebase Authentication & Firestore Security Rules</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-neutral-500 border-t border-neutral-200/60">
        Truncky AI • Built for Children Classes 1 to 5 • Safe, Private & Encouraging
      </footer>
    </div>
  );
};
