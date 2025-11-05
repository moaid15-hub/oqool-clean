import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  language?: string;
  content?: string;
  modified?: boolean;
  saved?: boolean;
}

export interface TabItem {
  id: string;
  file: FileItem;
  active: boolean;
}

export type ViewType = 'explorer' | 'search' | 'git' | 'extensions' | null;

export interface AppState {
  activeView: ViewType;
  aiPanelOpen: boolean;
  aiPanelMinimized: boolean;
  terminalOpen: boolean;
  currentFile: FileItem | null;
  openTabs: TabItem[];
  setActiveView: (view: ViewType) => void;
  setAIPanelOpen: (open: boolean) => void;
  setAIPanelMinimized: (minimized: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  setCurrentFile: (file: FileItem | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: 'explorer',
      aiPanelOpen: true,
      aiPanelMinimized: false,
      terminalOpen: false,
      currentFile: null,
      openTabs: [],
      setActiveView: (view) => set({ activeView: view }),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
      setAIPanelMinimized: (minimized) => set({ aiPanelMinimized: minimized }),
      setTerminalOpen: (open) => set({ terminalOpen: open }),
      setCurrentFile: (file) => set({ currentFile: file }),
    }),
    { name: 'oqool-app-storage' }
  )
);
