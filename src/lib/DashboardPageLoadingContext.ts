import { createContext } from "react";

/** Lets the dashboard page keep the legacy shell hidden until its first data load completes. */
export const DashboardPageLoadingContext = createContext<(loading: boolean) => void>(() => {});
