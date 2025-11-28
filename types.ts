export type Language = 'hu' | 'en' | 'ro';
export type Specialization = 'women' | 'men' | 'unisex';
export type Profession = 'hair' | 'nails' | 'cosmetics';
export type Theme = 'dark' | 'light';

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  color: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName?: string; // For voice-created appointments where client might not exist yet
  serviceId?: string; // Optional now
  startTime: Date; // JavaScript Date object
  notes?: string;
}

export interface AppSettings {
  businessStartHour: number;
  businessEndHour: number;
  specialization: Specialization;
  profession: Profession;
  defaultDuration: number;
  theme: Theme;
  wakeWordEnabled: boolean;
  serviceDurationOverrides: Record<string, number>; // Map service ID to custom minutes
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  MONTH = 'MONTH',
  CLIENTS = 'CLIENTS',
  SETTINGS = 'SETTINGS'
}

export type TimeSlot = {
  time: string; // "08:00"
  hour: number;
  minute: number;
};