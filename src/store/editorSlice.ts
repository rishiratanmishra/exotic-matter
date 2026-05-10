import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EditorFileState {
  path: string;
  isDirty: boolean;
  viewState?: any;
}

interface EditorState {
  openFiles: string[];
  activeFile: string | null;
  fileStates: Record<string, EditorFileState>;
}

const initialState: EditorState = {
  openFiles: [],
  activeFile: null,
  fileStates: {},
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    openFile(state, action: PayloadAction<string>) {
      const path = action.payload;
      if (!state.openFiles.includes(path)) {
        state.openFiles.push(path);
      }
      state.activeFile = path;
      if (!state.fileStates[path]) {
        state.fileStates[path] = { path, isDirty: false };
      }
    },
    closeFile(state, action: PayloadAction<string>) {
      const path = action.payload;
      state.openFiles = state.openFiles.filter((f) => f !== path);
      if (state.activeFile === path) {
        state.activeFile = state.openFiles.length > 0 ? state.openFiles[state.openFiles.length - 1] : null;
      }
      delete state.fileStates[path];
    },
    setActiveFile(state, action: PayloadAction<string | null>) {
      state.activeFile = action.payload;
    },
    setFileDirty(state, action: PayloadAction<{ path: string; isDirty: boolean }>) {
      const { path, isDirty } = action.payload;
      if (state.fileStates[path]) {
        state.fileStates[path].isDirty = isDirty;
      }
    },
    setFileViewState(state, action: PayloadAction<{ path: string; viewState: any }>) {
      const { path, viewState } = action.payload;
      if (state.fileStates[path]) {
        state.fileStates[path].viewState = viewState;
      }
    },
  },
});

export const { openFile, closeFile, setActiveFile, setFileDirty, setFileViewState } = editorSlice.actions;
export default editorSlice.reducer;
