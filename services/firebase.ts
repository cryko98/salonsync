
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { firebaseConfig } from '../firebaseConfig';
import { Appointment, Client } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// --- HELPER FUNCTIONS ---

// Clients
export const addClientToDb = async (userId: string, client: Omit<Client, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, `users/${userId}/clients`), client);
    return { ...client, id: docRef.id };
  } catch (e) {
    console.error("Error adding client: ", e);
    throw e;
  }
};

// Appointments
export const addAppointmentToDb = async (userId: string, appt: Omit<Appointment, 'id'>) => {
  try {
    // Convert Date objects to Firestore Timestamps if necessary, though SDK usually handles Dates
    const docRef = await addDoc(collection(db, `users/${userId}/appointments`), {
        ...appt,
        startTime: Timestamp.fromDate(appt.startTime)
    });
    return { ...appt, id: docRef.id };
  } catch (e) {
    console.error("Error adding appointment: ", e);
    throw e;
  }
};

export const updateAppointmentInDb = async (userId: string, apptId: string, data: Partial<Appointment>) => {
    const ref = doc(db, `users/${userId}/appointments`, apptId);
    const updateData: any = { ...data };
    if (data.startTime) {
        updateData.startTime = Timestamp.fromDate(data.startTime);
    }
    await updateDoc(ref, updateData);
};

export const deleteAppointmentFromDb = async (userId: string, apptId: string) => {
    await deleteDoc(doc(db, `users/${userId}/appointments`, apptId));
};
