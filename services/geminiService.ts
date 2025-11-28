import { GoogleGenAI } from "@google/genai";
import { Appointment, Service, Client } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateClientMessage = async (
  clientName: string,
  appointmentTime: Date,
  serviceName: string
): Promise<string> => {
  try {
    const ai = getAI();
    const dateStr = new Intl.DateTimeFormat('hu-HU', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(appointmentTime);
    
    const prompt = `
      Írj egy rövid, kedves, professzionális emlékeztető SMS üzenetet magyarul egy fodrász nevében.
      Vendég neve: ${clientName}
      Időpont: ${dateStr}
      Szolgáltatás: ${serviceName}
      
      Az üzenet legyen közvetlen, de udvarias. Ne legyen túl hosszú.
      Ne használj idézőjeleket az outputban.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "Nem sikerült az üzenet generálása.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hiba történt az AI kapcsolatban.";
  }
};

export const analyzeSchedule = async (
  appointments: Appointment[],
  services: Service[]
): Promise<string> => {
  try {
    const ai = getAI();
    
    // Simplify data for the prompt
    const scheduleData = appointments.map(app => {
      const service = services.find(s => s.id === app.serviceId);
      return {
        start: app.startTime.toLocaleTimeString('hu-HU', {hour: '2-digit', minute:'2-digit'}),
        service: service?.name || 'Ismeretlen',
        duration: service?.duration || 0
      };
    });

    const prompt = `
      Te egy profi szalon menedzser vagy. Elemezd a mai fodrász beosztást és adj 3 rövid tippet vagy összefoglalót magyarul.
      
      Mai beosztás:
      ${JSON.stringify(scheduleData)}
      
      Fókuszálj a következőkre:
      1. Mikor van nagyobb szünet (ebédszünet lehetőség)?
      2. Mennyire sűrű a nap?
      3. Van-e optimalizálási lehetőség?
      
      Formázd Markdown listaként.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Nem sikerült elemezni a beosztást.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hiba történt az elemzés során.";
  }
};
