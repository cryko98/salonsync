import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Scissors, FileText } from 'lucide-react';
import { Appointment, Client, Service, Language } from '../types';
import { Button } from './Button';
import { TRANSLATIONS } from '../constants';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Partial<Appointment>) => void;
  onDelete?: (id: string) => void;
  clients: Client[];
  services: Service[];
  initialDate?: Date;
  editingAppointment?: Appointment | null;
  lang: Language;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  clients,
  services,
  initialDate,
  editingAppointment,
  lang
}) => {
  const t = TRANSLATIONS[lang];
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState(''); // For new clients
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingAppointment) {
        setClientId(editingAppointment.clientId);
        setClientName(editingAppointment.clientName || '');
        setServiceId(editingAppointment.serviceId || '');
        setDate(editingAppointment.startTime.toISOString().split('T')[0]);
        setTime(editingAppointment.startTime.toTimeString().slice(0, 5));
        setNotes(editingAppointment.notes || '');
      } else {
        setClientId('');
        setClientName('');
        setServiceId('');
        const d = initialDate || new Date();
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().slice(0, 5));
        setNotes('');
      }
    }
  }, [isOpen, editingAppointment, initialDate]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!date || !time) return;

    const startTime = new Date(`${date}T${time}`);
    
    // Create appointment object
    onSave({
      id: editingAppointment?.id,
      clientId: clientId || 'temp_id', // Handle real ID generation upstream
      clientName: clientName || clients.find(c => c.id === clientId)?.name || 'Unknown',
      serviceId: serviceId || undefined,
      startTime,
      notes
    });
    onClose();
  };

  const inputClass = "w-full h-12 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none appearance-none transition-all";
  const labelClass = "text-xs font-medium text-amber-600 dark:text-amber-500/80 uppercase flex items-center gap-1 mb-1 tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <h2 className="text-xl font-serif text-neutral-900 dark:text-amber-50">
            {editingAppointment ? t.editAppt : t.newAppt}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto no-scrollbar">
          
          {/* Client Selection */}
          <div>
            <label className={labelClass}>
              <User size={14} /> {t.client}
            </label>
            <div className="relative">
              <select 
                className={inputClass}
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  const c = clients.find(cl => cl.id === e.target.value);
                  if (c) setClientName(c.name);
                }}
              >
                <option value="">-- {t.client} --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* If no existing client selected, allow typing name */}
            {!clientId && (
              <input 
                type="text" 
                placeholder="Vagy írd be a nevet..." 
                className={`${inputClass} mt-2`}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            )}
          </div>

          {/* Service Selection (Optional) */}
          <div>
            <label className={labelClass}>
              <Scissors size={14} /> {t.service} <span className="text-neutral-400 ml-1 text-[10px]">{t.optional}</span>
            </label>
            <select 
              className={inputClass}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">-- {t.optional} --</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                <Calendar size={14} /> {t.date}
              </label>
              <input 
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>
                <Clock size={14} /> {t.time}
              </label>
              <input 
                type="time"
                className={inputClass}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
             <label className={labelClass}><FileText size={14} /> {t.notes}</label>
             <textarea 
                className={`${inputClass} h-auto py-3`}
                rows={3}
                placeholder="..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
             />
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex gap-3">
          {editingAppointment && onDelete ? (
            <Button variant="danger" className="flex-1" onClick={() => { onDelete(editingAppointment.id); onClose(); }}>
              {t.delete}
            </Button>
          ) : (
             <Button variant="secondary" className="flex-1" onClick={onClose}>
              {t.cancel}
            </Button>
          )}
          
          <Button className="flex-[2]" onClick={handleSave}>
            {t.save}
          </Button>
        </div>
      </div>
    </div>
  );
};