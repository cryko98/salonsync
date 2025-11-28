import React from 'react';
import { Appointment, Client, Service, Language, AppSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { CalendarView } from './CalendarView';
import { Button } from './Button';
import { Plus, CalendarCheck } from 'lucide-react';

interface DashboardViewProps {
  currentDate: Date;
  appointments: Appointment[];
  services: Service[];
  clients: Client[];
  settings: AppSettings;
  lang: Language;
  onSlotClick: (time: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onNewBooking: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentDate,
  appointments,
  services,
  clients,
  settings,
  lang,
  onSlotClick,
  onAppointmentClick,
  onNewBooking
}) => {
  const t = TRANSLATIONS[lang];

  // Quick Stats
  const todayAppointments = appointments.filter(a => 
    a.startTime.getDate() === new Date().getDate() &&
    a.startTime.getMonth() === new Date().getMonth()
  );

  // Next Client
  const now = new Date();
  const upcoming = todayAppointments
    .filter(a => a.startTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
  
  const upcomingService = upcoming ? services.find(s => s.id === upcoming.serviceId) : null;
  const upcomingClient = upcoming ? (upcoming.clientName || clients.find(c => c.id === upcoming.clientId)?.name) : null;

  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      {/* Top Stats Cards */}
      <div className="p-4 grid grid-cols-1 gap-3 shrink-0">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
             <CalendarCheck size={16} />
             <span className="text-xs font-bold uppercase">{t.appointments}</span>
          </div>
          <div className="text-2xl font-serif font-bold text-neutral-900 dark:text-white">
            {todayAppointments.length}
          </div>
        </div>
      </div>

      {/* Next Client Card */}
      {upcoming && (
        <div className="mx-4 mb-4 p-5 bg-gradient-to-r from-amber-500 to-amber-700 rounded-2xl text-white shadow-lg shadow-amber-500/20 shrink-0">
            <div className="text-xs font-medium text-amber-100 uppercase mb-1">{t.nextClient}</div>
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-2xl font-bold font-serif">{upcomingClient}</div>
                    <div className="text-sm text-amber-100">{upcomingService?.name || 'Appointment'}</div>
                </div>
                <div className="text-3xl font-mono font-medium">
                    {upcoming.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        </div>
      )}

      {/* Quick Actions - Cleaned up */}
      <div className="px-4 mb-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
        <Button size="sm" className="w-full flex items-center justify-center" onClick={onNewBooking}>
            <Plus size={16} className="mr-2"/> {t.newAppt}
        </Button>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 relative border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden flex flex-col">
         <CalendarView 
            currentDate={currentDate}
            appointments={appointments}
            services={services}
            clients={clients}
            onSlotClick={onSlotClick}
            onAppointmentClick={onAppointmentClick}
            settings={settings}
         />
         
         {/* Floating Action Button (Alternative) */}
         <button 
            onClick={onNewBooking}
            className="absolute bottom-6 right-6 h-14 w-14 bg-amber-500 text-white dark:text-black rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-30"
         >
            <Plus size={28} strokeWidth={2.5} />
         </button>
      </div>
    </div>
  );
};