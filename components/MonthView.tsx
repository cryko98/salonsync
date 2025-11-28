import React from 'react';
import { Appointment, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  appointments: Appointment[];
  lang: Language;
  onDayClick: (d: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ 
  currentDate, 
  setCurrentDate, 
  appointments, 
  lang,
  onDayClick
}) => {
  const t = TRANSLATIONS[lang];
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday. We want Monday to be first column.
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Heatmap logic
  const getStatusColor = (day: number) => {
    const dayStart = new Date(year, month, day, 0, 0, 0);
    const dayEnd = new Date(year, month, day, 23, 59, 59);
    
    const count = appointments.filter(a => a.startTime >= dayStart && a.startTime <= dayEnd).length;
    
    if (count === 0) return 'bg-white dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'; // Empty
    if (count < 4) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700/50'; // Light
    if (count < 8) return 'bg-amber-400 dark:bg-amber-600/60 text-white border border-amber-500'; // Moderate
    return 'bg-red-500 dark:bg-red-900/80 text-white border border-red-500'; // Busy
  };

  const monthNames = [
    "Január / January", "Február / February", "Március / March", "Április / April", "Május / May", "Június / June",
    "Július / July", "Augusztus / August", "Szeptember / September", "Október / October", "November / November", "December / December"
  ];

  return (
    <div className="p-4 bg-neutral-50 dark:bg-neutral-950 min-h-full pb-24">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="p-2 rounded-full bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm border border-neutral-200 dark:border-neutral-700">
            <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-amber-50">{monthNames[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-full bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-sm border border-neutral-200 dark:border-neutral-700">
            <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-medium text-neutral-400 uppercase tracking-wider">
        <div>H/M</div>
        <div>K/T</div>
        <div>Sz/W</div>
        <div>Cs/T</div>
        <div>P/F</div>
        <div>Sz/S</div>
        <div>V/S</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {blanks.map(i => <div key={`blank-${i}`} className="aspect-square" />)}
        {days.map(day => (
          <button 
            key={day}
            onClick={() => onDayClick(new Date(year, month, day))}
            className={`aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-all shadow-sm ${getStatusColor(day)}`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600"></div> {t.free}
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300"></div> {t.moderate}
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 dark:bg-red-900/80 border border-red-500"></div> {t.busy}
        </div>
      </div>
    </div>
  );
};