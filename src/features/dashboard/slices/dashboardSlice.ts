import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ExtractedFile } from "../../../types/process";

interface ExtractionState {
  files: ExtractedFile[];
}

const initialState: ExtractionState = {
  files: [],
};

const dashboardSlice = createSlice({
  name: "extraction",
  initialState,
  reducers: {
    addFiles(state, action: PayloadAction<ExtractedFile[]>) {
      state.files = [...state.files, ...action.payload];
    },
    updateFile(state, action: PayloadAction<ExtractedFile>) {
      const idx = state.files.findIndex((f) => f.id === action.payload.id);
      if (idx !== -1) state.files[idx] = action.payload;
    },
    setFilesUploading(state, action: PayloadAction<string[]>) {
      state.files = state.files.map((f) =>
        action.payload.includes(f.id) ? { ...f, status: "uploading" } : f
      );
    },
    removeFile(state, action: PayloadAction<string>) {
      state.files = state.files.filter((f) => f.id !== action.payload);
    },
    clearFiles(state) {
      state.files = [];
    },
  },
});

export const { addFiles, updateFile, removeFile, clearFiles, setFilesUploading } = dashboardSlice.actions;
export default dashboardSlice.reducer;