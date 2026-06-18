import { create } from "zustand";
import type { RepairOrder, Part } from "~shared/types";
import { repairsApi, partsApi } from "@/lib/api";

interface AppState {
  repairs: RepairOrder[];
  parts: Part[];
  loading: boolean;
  error: string | null;
  fetchRepairs: (params?: { status?: string; phone?: string }) => Promise<void>;
  fetchParts: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  repairs: [],
  parts: [],
  loading: false,
  error: null,
  fetchRepairs: async (params) => {
    set({ loading: true });
    try {
      const data = await repairsApi.list(params);
      set({ repairs: data, error: null });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },
  fetchParts: async () => {
    set({ loading: true });
    try {
      const data = await partsApi.list();
      set({ parts: data, error: null });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },
}));
