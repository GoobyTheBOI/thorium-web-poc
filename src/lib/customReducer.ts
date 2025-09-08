import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { LayoutPresets } from "@/preferences/enums";

export interface CustomReducerState {
  layoutPreset: LayoutPresets;
}

const INITIAL_STATE: CustomReducerState = {
  layoutPreset: LayoutPresets.LINE_LENGTH,
};

const customReducer = createSlice({
  name: "custom",
  initialState: INITIAL_STATE,
  reducers: {
    setLayoutPreset: (state, action: PayloadAction<LayoutPresets>) => {
      state.layoutPreset = action.payload;
    },
  },
});

export const { 
  setLayoutPreset
} = customReducer.actions;

export default customReducer.reducer;