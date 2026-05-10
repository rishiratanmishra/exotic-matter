import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  theme: 'dark' | 'light';
  workspacePath: string | null;
  localModelPath: string;
  isVibeMode: boolean;
  isIndexing: boolean;
  indexingProgress: number;
}

const initialState: AppState = {
  theme: 'dark',
  workspacePath: null,
  localModelPath: 'd:\\exotic-matter\\models\\gemma-2-9b-it.gguf',
  isVibeMode: false,
  isIndexing: false,
  indexingProgress: 0,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<'dark' | 'light'>) {
      state.theme = action.payload;
    },
    setWorkspacePath(state, action: PayloadAction<string | null>) {
      state.workspacePath = action.payload;
    },
    setLocalModelPath(state, action: PayloadAction<string>) {
      state.localModelPath = action.payload;
    },
    toggleVibeMode(state) {
      state.isVibeMode = !state.isVibeMode;
    },
    setIndexing(state, action: PayloadAction<{ isIndexing: boolean; progress: number }>) {
      state.isIndexing = action.payload.isIndexing;
      state.indexingProgress = action.payload.progress;
    },
  },
});

export const { setTheme, setWorkspacePath, setLocalModelPath, toggleVibeMode, setIndexing } = appSlice.actions;
export default appSlice.reducer;
