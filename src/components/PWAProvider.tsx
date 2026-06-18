"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getOfflineQueue, syncOfflineQueue } from "@/lib/offlineQueue";

interface PWAContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<boolean>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initial values
    setIsOnline(navigator.onLine);
    setPendingCount(getOfflineQueue().length);

    // 2. Network listeners
    const handleOnline = async () => {
      setIsOnline(true);
      console.log("[PWA Provider] Network is online. Triggering auto-sync.");
      await triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("[PWA Provider] Network is offline.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 3. Listen to local queue change events
    const handleQueueChange = (e: Event) => {
      const count = (e as CustomEvent).detail;
      setPendingCount(count);
    };
    window.addEventListener("offline-queue-changed", handleQueueChange);

    // 4. Register custom Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[PWA Provider] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.error("[PWA Provider] Service Worker registration failed:", err);
        });
    }

    // 5. Initial sync if online
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-changed", handleQueueChange);
    };
  }, []);

  const triggerSync = async (): Promise<boolean> => {
    if (isSyncing || !navigator.onLine) return false;
    const queue = getOfflineQueue();
    if (queue.length === 0) return true;

    setIsSyncing(true);
    try {
      const success = await syncOfflineQueue((synced, total) => {
        setPendingCount(total - synced);
      });
      if (success) {
        console.log("[PWA Provider] Offline queue synced successfully.");
        // Notify components to refresh data (like patients, invoices, etc.)
        window.dispatchEvent(new CustomEvent("offline-sync-complete"));
      } else {
        console.warn("[PWA Provider] Some mutations failed to sync. Will retry.");
      }
      return success;
    } catch (err) {
      console.error("[PWA Provider] Sync failed:", err);
      return false;
    } finally {
      setIsSyncing(false);
      setPendingCount(getOfflineQueue().length);
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        syncNow: triggerSync,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
