import React, { useEffect, useState, useRef } from 'react';
import { X, Mic } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { Appointment, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface VoiceOverlayProps {
  isActive: boolean;
  onClose: () => void;
  lang: Language;
  appointments: Appointment[];
  onBookAppointment: (date: Date, name: string) => void;
  onCheckAvailability: (date: Date) => boolean;
  wakeWordEnabled: boolean;
  onActivate: () => void;
}

// Helper audio utils
function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext) {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ 
  isActive, 
  onClose, 
  lang, 
  appointments, 
  onBookAppointment, 
  onCheckAvailability,
  wakeWordEnabled,
  onActivate
}) => {
  const t = TRANSLATIONS[lang];
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Need refs for callbacks to access latest state
  const appointmentsRef = useRef(appointments);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  // Wake Word Listener
  useEffect(() => {
    if (!wakeWordEnabled || isActive) return;

    let recognition: any = null;
    if ('webkitSpeechRecognition' in window) {
      // @ts-ignore
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = lang === 'hu' ? 'hu-HU' : lang === 'ro' ? 'ro-RO' : 'en-US';

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const text = lastResult[0].transcript.toLowerCase();
        if (text.includes('sync')) {
          onActivate();
        }
      };

      try {
          recognition.start();
      } catch(e) { console.error(e); }
    }

    return () => {
      if (recognition) recognition.stop();
    };
  }, [wakeWordEnabled, isActive, lang, onActivate]);

  // Handle Session Start/Stop
  useEffect(() => {
    if (isActive) {
      startSession();
    } else {
      stopSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const startSession = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        
        audioContextRef.current = inputCtx;
        outputContextRef.current = outputCtx;
        nextStartTimeRef.current = 0;

        const tools = [{
          functionDeclarations: [
            {
              name: "check_availability",
              description: "Checks if the professional is free at a specific date and time.",
              parameters: {
                type: "OBJECT",
                properties: {
                  date: { type: "STRING", description: "The date and time (ISO format)" }
                },
                required: ["date"]
              }
            },
            {
              name: "book_appointment",
              description: "Books a new appointment.",
              parameters: {
                type: "OBJECT",
                properties: {
                  date: { type: "STRING", description: "The date and time (ISO format)" },
                  name: { type: "STRING", description: "Client name" }
                },
                required: ["date", "name"]
              }
            }
          ]
        }];

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                tools,
                systemInstruction: `You are 'Sync', a high-end AI receptionist for a beauty salon. 
                You have full access to the calendar.
                Speak briefly and elegantly in ${lang === 'hu' ? 'Hungarian' : lang === 'ro' ? 'Romanian' : 'English'}.
                If booking, ALWAYS check availability first.`,
            },
            callbacks: {
                onopen: () => {
                    // Input Stream
                    const source = inputCtx.createMediaStreamSource(stream);
                    const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(processor);
                    processor.connect(inputCtx.destination);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Tool Handling
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            let result = "Done";
                            if (fc.name === "check_availability") {
                                const d = new Date(fc.args['date']);
                                // Use callback prop to check against latest data
                                const isFree = onCheckAvailability(d); 
                                result = JSON.stringify({ available: isFree });
                            } else if (fc.name === "book_appointment") {
                                const d = new Date(fc.args['date']);
                                const name = fc.args['name'] as string;
                                onBookAppointment(d, name);
                                result = "Appointment confirmed.";
                            }

                            sessionPromise.then(s => s.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                }
                            }));
                        }
                    }

                    // Audio Output
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) {
                         const ctx = outputContextRef.current;
                         if (!ctx) return;
                         
                         nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                         const audioBuffer = await decodeAudioData(decode(audioData), ctx);
                         
                         const source = ctx.createBufferSource();
                         source.buffer = audioBuffer;
                         source.connect(ctx.destination);
                         source.start(nextStartTimeRef.current);
                         nextStartTimeRef.current += audioBuffer.duration;
                    }
                },
                onclose: () => console.log('Session closed'),
                onerror: (e) => console.error(e)
            }
        });
        sessionRef.current = sessionPromise;

    } catch (err) {
        console.error("Mic Error", err);
    }
  };

  const stopSession = () => {
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white">
        <X size={32} />
      </button>

      {/* Visualizer */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
        <div className="w-48 h-48 rounded-full border-4 border-amber-500/30 flex items-center justify-center bg-black/50 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
           <Mic size={64} className="text-amber-500" />
        </div>
      </div>

      <div className="flex gap-2 h-16 items-center justify-center">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bar w-2 bg-gradient-to-t from-amber-600 to-amber-300 rounded-full h-8 mx-1"></div>
        ))}
      </div>

      <h2 className="text-3xl font-serif text-white mt-8 font-bold">{t.listening}</h2>
      <p className="text-white/60 mt-2">{t.voiceActive}</p>

      <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm w-full px-6">
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
            <span className="text-amber-500 block text-lg font-bold">Check</span>
            <span className="text-xs text-neutral-400">"Van hely holnap 2-kor?"</span>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
            <span className="text-amber-500 block text-lg font-bold">Book</span>
            <span className="text-xs text-neutral-400">"Foglalj időpontot Annának"</span>
        </div>
      </div>
    </div>
  );
};