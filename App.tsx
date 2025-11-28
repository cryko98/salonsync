import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Mic, Plus, Settings, ChevronLeft, ChevronRight, Grid, Home, LogOut } from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { AppointmentModal } from './components/AppointmentModal';
import { MonthView } from './components/MonthView';
import { SettingsView } from './components/SettingsView';
import { VoiceOverlay } from './components/VoiceOverlay';
import { AuthScreen } from './components/AuthScreen';
import { ClientsView } from './components/ClientsView';
import { Appointment, Client, Service, ViewMode, Language, AppSettings } from './types';
import { SERVICES_MEN, SERVICES_WOMEN, SERVICES_NAILS, SERVICES_COSMETICS, TRANSLATIONS } from './constants';
import { Button } from './components/Button';

// Firebase imports
import { auth, db, addAppointmentToDb, updateAppointmentInDb, deleteAppointmentFromDb, addClientToDb } from './services/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';

const App: React.FC = () => {
  // --- Global State ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [lang, setLang] = useState<Language>('hu');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    businessStartHour: 8,
    businessEndHour: 20,
    specialization: 'women',
    profession: 'hair',
    defaultDuration: 30,
    theme: 'dark',
    wakeWordEnabled: true,
    serviceDurationOverrides: {}
  });

  // Data State (Real-time from Firebase)
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Listen for Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for DB Changes (Real-time)
  useEffect(() => {
    if (!user) {
        setAppointments([]);
        setClients([]);
        return;
    }

    // Subscribe to Appointments
    const qAppt = query(collection(db, `users/${user.uid}/appointments`));
    const unsubAppt = onSnapshot(qAppt, (snapshot) => {
        const appts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to JS Date
                startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime)
            } as Appointment;
        });
        setAppointments(appts);
    });

    // Subscribe to Clients
    const qClients = query(collection(db, `users/${user.uid}/clients`));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
        const cls = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Client));
        setClients(cls);
    });

    return () => {
        unsubAppt();
        unsubClients();
    };
  }, [user]);

  // Apply Theme
  useEffect(() => {
    if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);
  
  // Dynamic Services based on profession
  const services = useMemo(() => {
    let baseServices: Service[] = [];
    if (settings.profession === 'nails') baseServices = SERVICES_NAILS;
    else if (settings.profession === 'cosmetics') baseServices = SERVICES_COSMETICS;
    else if (settings.specialization === 'men') baseServices = SERVICES_MEN;
    else if (settings.specialization === 'women') baseServices = SERVICES_WOMEN;
    else baseServices = [...SERVICES_MEN, ...SERVICES_WOMEN];

    // Apply Overrides
    return baseServices.map(s => ({
      ...s,
      duration: settings.serviceDurationOverrides[s.id] || s.duration
    }));
  }, [settings.profession, settings.specialization, settings.serviceDurationOverrides]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<Date | undefined>(undefined);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const t = TRANSLATIONS[lang];

  // --- Navigation Logic ---
  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  
  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // --- Appointment Handlers (Firebase) ---
  const handleSlotClick = (time: Date) => {
    setSelectedSlotTime(time);
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleAppointmentClick = (app: Appointment) => {
    setEditingAppointment(app);
    setSelectedSlotTime(undefined);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (apptData: Partial<Appointment>) => {
    if (!user) return;

    try {
        if (apptData.id) {
          // Update
          await updateAppointmentInDb(user.uid, apptData.id, apptData);
        } else {
          // Create
          const newAppt = {
            clientId: apptData.clientId || 'temp',
            clientName: apptData.clientName,
            serviceId: apptData.serviceId,
            startTime: apptData.startTime!,
            notes: apptData.notes
          };
          await addAppointmentToDb(user.uid, newAppt);
        }
    } catch (err) {
        console.error("Failed to save appointment", err);
        alert("Hiba a mentés során.");
    }
  };

  const handleDeleteAppointment = async (id: string) => {
      if (!user) return;
      if (window.confirm("Biztosan törölni szeretnéd?")) {
          await deleteAppointmentFromDb(user.uid, id);
      }
  };

  // --- Client Handlers (Firebase) ---
  const handleAddClient = async (newClient: Client) => {
      if (!user) return;
      // Remove placeholder ID if present before sending to DB
      const { id, ...clientData } = newClient;
      await addClientToDb(user.uid, clientData);
  };

  // --- Voice Handlers ---
  const handleVoiceBook = async (date: Date, name: string) => {
      if (!user) return;
      const newAppt = {
        clientId: 'voice_generated',
        clientName: name,
        startTime: date,
        notes: 'AI Voice Booking'
      };
      await addAppointmentToDb(user.uid, newAppt);
  };

  const checkAvailability = (date: Date): boolean => {
      const buffer = 30 * 60000;
      const conflict = appointments.find(a => Math.abs(a.startTime.getTime() - date.getTime()) < buffer);
      return !conflict;
  };

  // --- 1. Loading ---
  if (authLoading) {
      return <div className="h-screen w-screen flex items-center justify-center bg-neutral-950 text-amber-500"><div className="animate-spin text-4xl">●</div></div>;
  }

  // --- 2. Auth Screen ---
  if (!user) {
    return (
      <AuthScreen 
        onLogin={() => {}} // Handled inside component via Firebase
        lang={lang} 
        setLang={setLang}
      />
    );
  }

  // --- 3. Onboarding Screen ---
  if (!hasOnboarded) {
    return (
      <div className="h-screen bg-neutral-900 text-amber-50 flex flex-col items-center justify-center p-8 space-y-12">
        <div className="text-center space-y-2 animate-in fade-in zoom-in duration-500">
            <h1 className="text-5xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-600">SalonSync</h1>
            <p className="text-neutral-400 tracking-widest text-xs uppercase">Professional Beauty Management</p>
        </div>

        <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase text-center block">{t.selectLang}</label>
                <div className="flex gap-2 justify-center">
                    {(['hu', 'en', 'ro'] as Language[]).map(l => (
                        <button 
                            key={l}
                            onClick={() => setLang(l)}
                            className={`px-4 py-2 rounded-full border text-sm transition-all ${lang === l ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'border-neutral-700 text-neutral-400'}`}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

             <div className="space-y-3">
                <label className="text-xs text-neutral-500 uppercase text-center block">{t.professionLabel}</label>
                <div className="flex flex-col gap-2">
                    <Button variant={settings.profession === 'hair' ? 'primary' : 'secondary'} onClick={() => setSettings({...settings, profession: 'hair'})}>{t.hair}</Button>
                    <Button variant={settings.profession === 'nails' ? 'primary' : 'secondary'} onClick={() => setSettings({...settings, profession: 'nails'})}>{t.nails}</Button>
                    <Button variant={settings.profession === 'cosmetics' ? 'primary' : 'secondary'} onClick={() => setSettings({...settings, profession: 'cosmetics'})}>{t.cosmetics}</Button>
                </div>
            </div>

            {settings.profession === 'hair' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                    <label className="text-xs text-neutral-500 uppercase text-center block">{t.specLabel}</label>
                    <div className="flex flex-col gap-2">
                        <Button variant={settings.specialization === 'women' ? 'primary' : 'secondary'} onClick={() => setSettings({...settings, specialization: 'women'})}>{t.women}</Button>
                        <Button variant={settings.specialization === 'men' ? 'primary' : 'secondary'} onClick={() => setSettings({...settings, specialization: 'men'})}>{t.men}</Button>
                        <Button variant={settings.specialization === 'unisex' ? 'primary' : 'secondary'} onClick={() => setSettings({...settings, specialization: 'unisex'})}>{t.unisex}</Button>
                    </div>
                </div>
            )}

            <Button className="w-full mt-8" size="lg" onClick={() => setHasOnboarded(true)}>{t.continue}</Button>
        </div>
      </div>
    );
  }

  const dateString = currentDate.toLocaleDateString(lang === 'hu' ? 'hu-HU' : lang === 'ro' ? 'ro-RO' : 'en-US', { weekday: 'short', month: 'long', day: 'numeric' });

  // --- 4. Main App ---
  return (
    <div className="flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      
      {/* Voice Overlay (Always Mounted) */}
      <VoiceOverlay 
         isActive={isVoiceActive} 
         onClose={() => setIsVoiceActive(false)}
         lang={lang}
         appointments={appointments}
         onBookAppointment={handleVoiceBook}
         onCheckAvailability={checkAvailability}
         wakeWordEnabled={settings.wakeWordEnabled}
         onActivate={() => setIsVoiceActive(true)}
      />

      {/* Top Header */}
      <header className="px-4 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-white/5 flex justify-between items-center z-20 sticky top-0 transition-colors">
        <h1 className="text-xl font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
            SalonSync
        </h1>
        <div className="flex items-center gap-3">
            {viewMode === ViewMode.DASHBOARD && (
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-full p-1 border border-neutral-200 dark:border-white/5">
                <button onClick={prevDay} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"><ChevronLeft size={14}/></button>
                <span className="text-xs font-semibold w-28 text-center capitalize text-neutral-700 dark:text-neutral-200">{isToday(currentDate) ? (lang === 'hu' ? 'Ma' : 'Today') : dateString}</span>
                <button onClick={nextDay} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"><ChevronRight size={14}/></button>
            </div>
            )}
             <button onClick={() => signOut(auth)} className="text-neutral-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {viewMode === ViewMode.DASHBOARD && (
            <DashboardView 
                currentDate={currentDate}
                appointments={appointments}
                services={services}
                clients={clients}
                settings={settings}
                lang={lang}
                onSlotClick={handleSlotClick}
                onAppointmentClick={handleAppointmentClick}
                onNewBooking={() => {
                    setEditingAppointment(null);
                    setSelectedSlotTime(undefined);
                    setIsModalOpen(true);
                }}
            />
        )}

        {viewMode === ViewMode.MONTH && (
             <div className="overflow-y-auto h-full">
                <MonthView 
                    currentDate={currentDate} 
                    setCurrentDate={setCurrentDate}
                    appointments={appointments}
                    lang={lang}
                    onDayClick={(d) => {
                        setCurrentDate(d);
                        setViewMode(ViewMode.DASHBOARD);
                    }}
                />
            </div>
        )}

        {viewMode === ViewMode.CLIENTS && (
            <ClientsView 
                clients={clients}
                onAddClient={handleAddClient}
                lang={lang}
            />
        )}
        
        {viewMode === ViewMode.SETTINGS && (
            <SettingsView 
              settings={settings} 
              updateSettings={setSettings} 
              lang={lang} 
              services={services}
            />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/5 pb-safe pt-2 px-2 z-40 sticky bottom-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] transition-colors">
        <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => setViewMode(ViewMode.DASHBOARD)}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${viewMode === ViewMode.DASHBOARD ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`}
          >
            <Home size={20} strokeWidth={viewMode === ViewMode.DASHBOARD ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">{t.dashboard}</span>
          </button>

          <button 
            onClick={() => setViewMode(ViewMode.MONTH)}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${viewMode === ViewMode.MONTH ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`}
          >
            <Grid size={20} strokeWidth={viewMode === ViewMode.MONTH ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">{t.month}</span>
          </button>
          
          {/* Main Voice Trigger in Navbar */}
          <button 
            onClick={() => setIsVoiceActive(true)}
            className="flex flex-col items-center justify-center -mt-6 h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 shadow-lg text-white transform transition-transform active:scale-95"
          >
            <Mic size={28} strokeWidth={2.5} />
          </button>

          <button 
            onClick={() => setViewMode(ViewMode.CLIENTS)}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${viewMode === ViewMode.CLIENTS ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`}
          >
            <Users size={20} strokeWidth={viewMode === ViewMode.CLIENTS ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">{t.clients}</span>
          </button>

          <button 
            onClick={() => setViewMode(ViewMode.SETTINGS)}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${viewMode === ViewMode.SETTINGS ? 'text-amber-600 dark:text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`}
          >
            <Settings size={20} strokeWidth={viewMode === ViewMode.SETTINGS ? 2.5 : 2} />
            <span className="text-[10px] font-medium tracking-wide">{t.settings}</span>
          </button>
        </div>
      </nav>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        clients={clients}
        services={services}
        initialDate={selectedSlotTime || currentDate}
        editingAppointment={editingAppointment}
        lang={lang}
      />
    </div>
  );
};

export default App;