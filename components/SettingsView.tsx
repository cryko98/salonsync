import React from 'react';
import { AppSettings, Language, Service } from '../types';
import { TRANSLATIONS } from '../constants';
import { Button } from './Button';
import { Moon, Sun, Mic, Clock } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
  lang: Language;
  services?: Service[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, updateSettings, lang, services = [] }) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="h-full overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-950 space-y-8 pb-24">
      <h2 className="text-2xl font-serif font-bold text-neutral-900 dark:text-amber-50 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        {t.settings}
      </h2>

      {/* Appearance */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-amber-600 dark:text-amber-500/80 flex items-center gap-2">
            {t.theme}
        </h3>
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => updateSettings({...settings, theme: 'light'})}
                className={`p-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${settings.theme === 'light' ? 'bg-white border-amber-500 text-amber-600 shadow-md' : 'bg-neutral-100 border-transparent text-neutral-500'}`}
            >
                <Sun size={20} /> {t.light}
            </button>
            <button 
                onClick={() => updateSettings({...settings, theme: 'dark'})}
                className={`p-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${settings.theme === 'dark' ? 'bg-neutral-900 border-amber-500 text-amber-500 shadow-md' : 'bg-neutral-200 dark:bg-neutral-800 border-transparent text-neutral-500'}`}
            >
                <Moon size={20} /> {t.dark}
            </button>
        </div>
      </div>

      {/* Voice */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-amber-600 dark:text-amber-500/80 flex items-center gap-2">
            <Mic size={18} /> Voice AI (Sync)
        </h3>
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
            <div>
                <div className="font-bold text-neutral-900 dark:text-neutral-100">{t.wakeWord}</div>
                <div className="text-xs text-neutral-500">{t.sayLuxe}</div>
            </div>
            <div 
                className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${settings.wakeWordEnabled ? 'bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                onClick={() => updateSettings({...settings, wakeWordEnabled: !settings.wakeWordEnabled})}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.wakeWordEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-amber-600 dark:text-amber-500/80">{t.businessHours}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-500 uppercase mb-1 block">{t.start}</label>
            <input 
              type="number" 
              min="0" max="23"
              className="w-full p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-center font-mono text-xl focus:border-amber-500 outline-none"
              value={settings.businessStartHour}
              onChange={(e) => updateSettings({...settings, businessStartHour: parseInt(e.target.value)})}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 uppercase mb-1 block">{t.end}</label>
            <input 
              type="number" 
              min="0" max="23"
              className="w-full p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-center font-mono text-xl focus:border-amber-500 outline-none"
              value={settings.businessEndHour}
              onChange={(e) => updateSettings({...settings, businessEndHour: parseInt(e.target.value)})}
            />
          </div>
        </div>
      </div>

      {/* Service Duration Customization */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-amber-600 dark:text-amber-500/80 flex items-center gap-2">
            <Clock size={18} /> {t.serviceDurations}
        </h3>
        <div className="space-y-3">
            {services.map(service => (
                <div key={service.id} className="flex items-center justify-between bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate pr-2 max-w-[60%]">
                        {service.name.split('/')[0]}
                    </span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="5" 
                            step="5"
                            className="w-16 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-center font-mono text-sm outline-none focus:ring-1 focus:ring-amber-500"
                            value={service.duration}
                            onChange={(e) => {
                                const newDuration = parseInt(e.target.value) || 0;
                                updateSettings({
                                    ...settings,
                                    serviceDurationOverrides: {
                                        ...settings.serviceDurationOverrides,
                                        [service.id]: newDuration
                                    }
                                });
                            }}
                        />
                        <span className="text-xs text-neutral-500">{t.minutes}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="pt-8 text-center text-neutral-400 dark:text-neutral-600 text-xs uppercase tracking-widest">
        SalonSync v3.3
      </div>
    </div>
  );
};