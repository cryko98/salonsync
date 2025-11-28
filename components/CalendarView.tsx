import React, { useMemo } from 'react';
import { Appointment, Service, Client, TimeSlot } from '../types';

interface CalendarViewProps {
  currentDate: Date;
  appointments: Appointment[];
  services: Service[];
  clients: Client[];
  onSlotClick: (time: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  settings: { businessStartHour: number, businessEndHour: number };
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  appointments,
  services,
  clients,
  onSlotClick,
  onAppointmentClick,
  settings
}) => {
  const { businessStartHour, businessEndHour } = settings;

  // Generate time slots
  const slots: TimeSlot[] = useMemo(() => {
    const s: TimeSlot[] = [];
    for (let h = businessStartHour; h <= businessEndHour; h++) {
      s.push({ time: `${h.toString().padStart(2, '0')}:00`, hour: h, minute: 0 });
      if (h !== businessEndHour) {
        s.push({ time: `${h.toString().padStart(2, '0')}:30`, hour: h, minute: 30 });
      }
    }
    return s;
  }, [businessStartHour, businessEndHour]);

  // Filter appointments for the current day
  const dailyAppointments = useMemo(() => {
    return appointments.filter(app => {
      return (
        app.startTime.getDate() === currentDate.getDate() &&
        app.startTime.getMonth() === currentDate.getMonth() &&
        app.startTime.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [appointments, currentDate]);

  const getService = (id?: string) => services.find(s => s.id === id);
  const getClient = (id: string) => clients.find(c => c.id === id);

  // Helper to calculate position and height
  const getPositionStyles = (app: Appointment) => {
    const startHour = app.startTime.getHours();
    const startMin = app.startTime.getMinutes();
    const service = getService(app.serviceId);
    // If no service, default to 30 mins
    const duration = service?.duration || 30;

    // Minutes from start of business day
    const startMinutesFromBase = (startHour - businessStartHour) * 60 + startMin;
    
    // Scale: 1 min = 1.6px
    const PIXELS_PER_MINUTE = 1.6; 
    
    const top = startMinutesFromBase * PIXELS_PER_MINUTE;
    const height = duration * PIXELS_PER_MINUTE;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  return (
    <div className="flex-1 relative overflow-y-auto no-scrollbar pb-32">
      {/* Time Grid */}
      <div className="relative" style={{ height: `${(businessEndHour - businessStartHour + 1) * 60 * 1.6}px` }}>
        {slots.map((slot, index) => (
            slot.minute === 0 && (
                <div key={index} className="flex w-full absolute left-0" style={{ top: `${(slot.hour - businessStartHour) * 60 * 1.6}px` }}>
                    <div className="w-16 text-right pr-3 text-xs font-medium text-neutral-400 dark:text-neutral-600 -mt-2.5 font-mono">
                      {slot.time}
                    </div>
                    <div className="flex-1 border-t border-neutral-200 dark:border-neutral-800 relative group">
                        {/* Invisible click target for the hour */}
                        <div 
                            className="absolute inset-0 h-[48px] z-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            onClick={() => {
                                const d = new Date(currentDate);
                                d.setHours(slot.hour, slot.minute);
                                onSlotClick(d);
                            }}
                        />
                         {/* Half hour marker visual only */}
                        <div className="absolute top-[50%] left-0 right-0 border-t border-neutral-100 dark:border-neutral-800/50 border-dashed" />
                         {/* Invisible click target for half past */}
                         <div 
                            className="absolute top-[50%] left-0 right-0 h-[48px] z-0 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            onClick={() => {
                                const d = new Date(currentDate);
                                d.setHours(slot.hour, 30);
                                onSlotClick(d);
                            }}
                        />
                    </div>
                </div>
            )
        ))}

        {/* Appointments Layer */}
        <div className="absolute top-0 right-2 left-16 bottom-0">
          {dailyAppointments.map((app) => {
            const service = getService(app.serviceId);
            const client = getClient(app.clientId);
            const clientDisplayName = app.clientName || client?.name || "Vendég";
            const styles = getPositionStyles(app);
            const colorClass = service?.color || 'border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200';

            return (
              <div
                key={app.id}
                style={styles}
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(app);
                }}
                className={`absolute w-full rounded-md border-l-[3px] p-2 text-xs shadow-md shadow-black/5 cursor-pointer hover:brightness-105 transition-all z-10 overflow-hidden ${colorClass}`}
              >
                <div className="font-bold truncate text-sm">{clientDisplayName}</div>
                <div className="opacity-80 truncate text-[10px] uppercase tracking-wide">
                  {service?.name || 'General'}
                </div>
                <div className="absolute top-1 right-2 opacity-90 font-mono font-bold">
                  {app.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current Time Indicator */}
      <div className="absolute left-16 right-0 border-t border-amber-500 z-20 pointer-events-none flex items-center shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
           style={{ top: `${((new Date().getHours() - businessStartHour) * 60 + new Date().getMinutes()) * 1.6}px`, display: currentDate.toDateString() === new Date().toDateString() ? 'flex' : 'none' }}>
           <div className="w-2 h-2 bg-amber-500 rounded-full -ml-1 shadow-lg"></div>
      </div>
    </div>
  );
};