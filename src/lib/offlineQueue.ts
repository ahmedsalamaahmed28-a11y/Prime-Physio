import { supabase } from './supabase';

export interface OfflineMutation {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  tempId?: string;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = 'prime_physio_offline_queue';

// Get current offline queue
export function getOfflineQueue(): OfflineMutation[] {
  return [];
}

// Save queue to local storage
export function saveOfflineQueue(queue: OfflineMutation[]) {
  return;
}

// Add mutation to the queue
export function queueOfflineMutation(table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any, tempId?: string) {
  console.warn("Offline queue disabled; mutation is not cached locally.", { table, action, tempId });
}

// Clear queue
export function clearOfflineQueue() {
  return;
}

// Process the offline queue when coming back online
export async function syncOfflineQueue(onProgress?: (syncedCount: number, total: number) => void): Promise<boolean> {
  if (onProgress) onProgress(0, 0);
  return true;
}
