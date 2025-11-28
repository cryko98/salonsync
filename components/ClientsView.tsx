import React, { useState } from 'react';
import { Client, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Search, Plus, User, Phone, FileText } from 'lucide-react';
import { Button } from './Button';

interface ClientsViewProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
  lang: Language;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ clients, onAddClient, lang }) => {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Client Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleSave = () => {
    if (!newName) return;
    onAddClient({
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      phone: newPhone,
      notes: newNotes
    });
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setIsAdding(false);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-neutral-400";

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 flex flex-col p-4 pb-24">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-serif font-bold text-neutral-900 dark:text-amber-50">{t.clients}</h2>
            <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus size={16} className="mr-1" /> {t.addClient}
            </Button>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-3.5 text-neutral-400" size={18} />
            <input 
                type="text" 
                placeholder={t.search} 
                className={inputClass}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      {/* Add Client Modal/Form Overlay */}
      {isAdding && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold mb-4 text-neutral-900 dark:text-white">{t.addClient}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs uppercase text-neutral-500 font-bold ml-1 mb-1 block">{t.name}</label>
                          <input type="text" className={inputClass} value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                      </div>
                      <div>
                          <label className="text-xs uppercase text-neutral-500 font-bold ml-1 mb-1 block">{t.phone}</label>
                          <input type="tel" className={inputClass} value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs uppercase text-neutral-500 font-bold ml-1 mb-1 block">{t.notes}</label>
                          <textarea className={inputClass} rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} />
                      </div>
                      <div className="flex gap-2 mt-4">
                          <Button variant="secondary" className="flex-1" onClick={() => setIsAdding(false)}>{t.cancel}</Button>
                          <Button className="flex-1" onClick={handleSave} disabled={!newName}>{t.save}</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
        {filteredClients.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
                <User size={48} className="mx-auto mb-3 opacity-20" />
                <p>{t.noClients}</p>
            </div>
        ) : (
            filteredClients.map(client => (
                <div key={client.id} className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex justify-between items-center shadow-sm hover:border-amber-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 font-bold border border-neutral-200 dark:border-neutral-700">
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-bold text-base text-neutral-800 dark:text-neutral-200">{client.name}</div>
                            {client.phone && (
                                <div className="text-neutral-500 text-sm font-mono flex items-center gap-1">
                                    <Phone size={10} /> {client.phone}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};