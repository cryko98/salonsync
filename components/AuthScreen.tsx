import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Button } from './Button';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthScreenProps {
  onLogin: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, lang, setLang }) => {
  const t = TRANSLATIONS[lang];
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Firebase Auth basic doesn't store display name easily in one go, but we'll focus on auth first

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        if (isRegistering) {
            await createUserWithEmailAndPassword(auth, email, password);
            // On success, Auth listener in App.tsx will switch screen
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (err: any) {
        console.error(err);
        let msg = "Hiba történt.";
        if (err.code === 'auth/invalid-email') msg = "Érvénytelen email cím.";
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = "Hibás email vagy jelszó.";
        if (err.code === 'auth/email-already-in-use') msg = "Ez az email már regisztrálva van.";
        if (err.code === 'auth/weak-password') msg = "A jelszó túl gyenge (min 6 karakter).";
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  const inputClass = "w-full h-12 pl-10 pr-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all placeholder:text-neutral-400";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 flex gap-2">
         {(['hu', 'en', 'ro'] as Language[]).map(l => (
            <button 
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs font-bold uppercase px-2 py-1 rounded-md transition-all ${lang === l ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
                {l}
            </button>
         ))}
      </div>

      {/* Logo Area */}
      <div className="mb-12 text-center animate-in slide-in-from-top-10 duration-700">
         <h1 className="text-6xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700 mb-2">
            SalonSync
         </h1>
         <p className="text-neutral-500 dark:text-neutral-400 tracking-[0.2em] text-xs uppercase font-medium">
             Luxury Booking Management
         </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-white/10 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 text-center">
            {isRegistering ? t.register : t.login}
        </h2>

        {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegistering && (
                <div className="space-y-1 animate-in fade-in slide-in-from-left-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase ml-1">{t.name}</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-neutral-400" size={18} />
                        <input 
                            type="text" 
                            className={inputClass} 
                            placeholder="John Doe"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            // Not required for minimal Auth flow, but good for UI
                        />
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase ml-1">{t.email}</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-neutral-400" size={18} />
                    <input 
                        type="email" 
                        className={inputClass} 
                        placeholder="hello@salon.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-500 uppercase ml-1">{t.password}</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-neutral-400" size={18} />
                    <input 
                        type="password" 
                        className={inputClass} 
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            {!isRegistering && (
                <div className="flex justify-end">
                    <button type="button" className="text-xs text-amber-600 dark:text-amber-500 hover:underline">
                        {t.forgotPass}
                    </button>
                </div>
            )}

            <Button type="submit" className="w-full mt-4" size="lg" isLoading={loading}>
                {isRegistering ? t.registerBtn : t.loginBtn}
            </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-white/10 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                {isRegistering ? t.hasAccount : t.noAccount}
            </p>
            <button 
                onClick={() => { setIsRegistering(!isRegistering); setEmail(''); setPassword(''); setName(''); setError(''); }}
                className="text-sm font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
                {isRegistering ? t.loginBtn : t.registerBtn}
            </button>
        </div>
      </div>
    </div>
  );
};