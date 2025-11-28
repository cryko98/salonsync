import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, Square, MessageSquare, CalendarCheck } from 'lucide-react';
import { Button } from './Button';
import { Appointment, Client, Service, Language, Specialization } from '../types';
import { generateClientMessage, analyzeSchedule } from '../services/geminiService';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TRANSLATIONS } from '../constants';

interface AssistantViewProps {
  appointments: Appointment[];
  services: Service[];
  clients: Client[];
  lang: Language;
  onBookAppointment: (date: Date, name: string) => void;
}

// Simple Audio Decoding util
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  let binary = '';
  const len = new Uint8Array(int16.buffer).byteLength;
  const bytes = new Uint8Array(int16.buffer);
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const AssistantView: React.FC<AssistantViewProps> = ({ appointments, services, clients, lang, onBookAppointment }) => {
  const t = TRANSLATIONS[lang];
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'voice' | 'daily' | 'message'>('voice');
  const [selectedAppt, setSelectedAppt] = useState<string>('');
  
  // Live API State
  const [isLive, setIsLive] = useState(false);
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Function to check availability (Tool)
  const checkAvailability = (dateStr: string) => {
    // Basic check: is there an appointment at this time?
    // dateStr format expected ISO or close
    const reqDate = new Date(dateStr);
    const existing = appointments.find(a => Math.abs(a.startTime.getTime() - reqDate.getTime()) < 30 * 60000); // within 30 mins
    
    if (existing) {
        return { available: false, message: "Occupied / Foglalt" };
    }
    return { available: true, message: "Free / Szabad" };
  };

  const startLiveSession = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Audio Setup
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        
        audioContextRef.current = inputAudioContext;
        outputContextRef.current = outputAudioContext;
        
        const inputNode = inputAudioContext.createGain();
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);

        const tools = [
            {
                functionDeclarations: [
                    {
                        name: "check_availability",
                        description: "Checks if the hairdresser is free at a specific time.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                date: { type: "STRING", description: "The date and time to check (ISO format or YYYY-MM-DD HH:MM)" }
                            },
                            required: ["date"]
                        }
                    },
                    {
                        name: "book_appointment",
                        description: "Books a new appointment for a client.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                date: { type: "STRING", description: "The date and time (ISO format)" },
                                name: { type: "STRING", description: "Name of the client" }
                            },
                            required: ["date", "name"]
                        }
                    }
                ]
            }
        ];

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                tools: tools,
                systemInstruction: `You are a helpful receptionist for a hairdresser salon. 
                Speak in ${lang === 'hu' ? 'Hungarian' : lang === 'ro' ? 'Romanian' : 'English'}.
                Be polite, luxurious and concise. 
                If the user wants to book, first check availability. If free, book it.`,
            },
            callbacks: {
                onopen: () => {
                    setIsLive(true);
                    // Input processing
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle Tools
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            let result = "Done";
                            if (fc.name === "check_availability") {
                                const res = checkAvailability(fc.args['date']);
                                result = JSON.stringify(res);
                            } else if (fc.name === "book_appointment") {
                                const d = new Date(fc.args['date']);
                                onBookAppointment(d, fc.args['name']);
                                result = "Appointment Booked successfully.";
                            }

                            sessionPromise.then(session => session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: result }
                                }
                            }));
                        }
                    }

                    // Handle Audio Output
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) {
                         const ctx = outputContextRef.current;
                         if (!ctx) return;

                         nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                         
                         const audioBuffer = await decodeAudioData(
                             decode(audioData),
                             ctx,
                             24000,
                             1
                         );
                         
                         const source = ctx.createBufferSource();
                         source.buffer = audioBuffer;
                         source.connect(outputNode);
                         source.addEventListener('ended', () => {
                             sourcesRef.current.delete(source);
                         });
                         source.start(nextStartTimeRef.current);
                         nextStartTimeRef.current += audioBuffer.duration;
                         sourcesRef.current.add(source);
                    }
                },
                onclose: () => {
                    setIsLive(false);
                },
                onerror: (e) => console.error(e)
            }
        });
        sessionRef.current = sessionPromise;

    } catch (err) {
        console.error("Mic error", err);
        alert(t.micPermission);
    }
  };

  const stopLiveSession = () => {
     // Hard refresh or close context to stop (simplest for this demo structure)
     if (audioContextRef.current) audioContextRef.current.close();
     if (outputContextRef.current) outputContextRef.current.close();
     setIsLive(false);
     window.location.reload(); // To ensure full cleanup of audio streams in this demo
  };

  const handleAnalyzeDay = async () => {
    setLoading(true);
    setResponse(null);
    const today = new Date();
    const futureAppointments = appointments.filter(a => a.startTime >= today);
    const result = await analyzeSchedule(futureAppointments.slice(0, 10), services);
    setResponse(result);
    setLoading(false);
  };

  const handleGenerateMessage = async () => {
    if (!selectedAppt) return;
    setLoading(true);
    setResponse(null);
    
    const appt = appointments.find(a => a.id === selectedAppt);
    if (appt) {
      const client = clients.find(c => c.id === appt.clientId);
      const service = services.find(s => s.id === appt.serviceId);
      
      const clientName = appt.clientName || client?.name || "Vendég";
      const serviceName = service?.name || "Hajvágás";

      if (clientName) {
        const result = await generateClientMessage(clientName, appt.startTime, serviceName);
        setResponse(result);
      }
    }
    setLoading(false);
  };

  const upcomingAppointments = appointments
    .filter(a => a.startTime > new Date())
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 5);

  return (
    <div className="p-4 space-y-6 pb-24 bg-neutral-950 min-h-full">
      <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-6 text-black shadow-lg shadow-amber-900/20">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="text-white" />
          <h2 className="text-xl font-serif font-bold text-white">{t.assistant}</h2>
        </div>
        <p className="text-amber-100 text-sm font-medium opacity-90">
          "SalonSync AI" - Voice & Schedule Intelligence.
        </p>
      </div>

      <div className="flex gap-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
        <button 
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'voice' ? 'bg-neutral-800 text-amber-500 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <Mic size={16} className="mx-auto mb-1" />
        </button>
        <button 
          onClick={() => { setActiveTab('daily'); setResponse(null); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'daily' ? 'bg-neutral-800 text-amber-500 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <CalendarCheck size={16} className="mx-auto mb-1" />
        </button>
        <button 
          onClick={() => { setActiveTab('message'); setResponse(null); }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'message' ? 'bg-neutral-800 text-amber-500 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          <MessageSquare size={16} className="mx-auto mb-1" />
        </button>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-sm rounded-3xl border border-neutral-800 p-6 shadow-xl min-h-[300px] flex flex-col justify-center">
        
        {activeTab === 'voice' && (
             <div className="text-center space-y-8">
                 <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer border-4 ${isLive ? 'bg-amber-500 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-neutral-800 border-neutral-700 hover:border-amber-500/50'}`}
                      onClick={isLive ? stopLiveSession : startLiveSession}
                 >
                     {isLive ? <Square size={40} className="text-black fill-black" /> : <Mic size={40} className="text-amber-500" />}
                 </div>
                 
                 <div className="space-y-2">
                     <h3 className="text-xl font-bold text-neutral-200">
                         {isLive ? t.listening : t.tapToSpeak}
                     </h3>
                     <p className="text-sm text-neutral-500">
                        {isLive ? "Mondd: \"Van szabad hely holnap délután?\"" : "Hands-free AI Booking Agent"}
                     </p>
                 </div>
             </div>
        )}

        {activeTab === 'daily' && (
          <div className="space-y-4">
            <p className="text-neutral-400 text-sm text-center">{t.analyze} - Daily Optimization</p>
            <Button onClick={handleAnalyzeDay} isLoading={loading} className="w-full">
              {t.analyze}
            </Button>
          </div>
        )}

        {activeTab === 'message' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase">{t.client}</label>
              <select 
                className="w-full p-3 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-200 text-sm outline-none"
                value={selectedAppt}
                onChange={(e) => setSelectedAppt(e.target.value)}
              >
                <option value="">-- {t.client} --</option>
                {upcomingAppointments.map(app => {
                    const c = clients.find(cl => cl.id === app.clientId);
                    return (
                        <option key={app.id} value={app.id}>
                             {app.clientName || c?.name} - {app.startTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </option>
                    )
                })}
              </select>
            </div>
            <Button onClick={handleGenerateMessage} disabled={!selectedAppt} isLoading={loading} className="w-full">
              {t.genMessage}
            </Button>
          </div>
        )}

        {response && (
          <div className="mt-6 pt-6 border-t border-dashed border-neutral-800 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">
              {response}
            </div>
            {activeTab === 'message' && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 w-full text-amber-500"
                    onClick={() => {
                        navigator.clipboard.writeText(response);
                        alert("Copied!");
                    }}
                >
                    Copy to Clipboard
                </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};