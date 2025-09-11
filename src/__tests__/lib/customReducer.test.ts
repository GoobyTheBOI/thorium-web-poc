import customReducer, { setLayoutPreset, CustomReducerState } from '@/lib/customReducer';
import { LayoutPresets } from '@/preferences/enums';

describe('customReducer', () => {
  const initialState: CustomReducerState = {
    layoutPreset: LayoutPresets.LINE_LENGTH,
  };

  it('should return the initial state', () => {
    expect(customReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setLayoutPreset action', () => {
    const action = setLayoutPreset(LayoutPresets.MARGIN);
    const result = customReducer(initialState, action);

    expect(result.layoutPreset).toBe(LayoutPresets.MARGIN);
  });

  it('should handle setLayoutPreset with all layout preset values', () => {
    Object.values(LayoutPresets).forEach(preset => {
      const action = setLayoutPreset(preset);
      const result = customReducer(initialState, action);

      expect(result.layoutPreset).toBe(preset);
    });
  });

  it('should not mutate the original state', () => {
    const action = setLayoutPreset(LayoutPresets.CUSTOM);
    const result = customReducer(initialState, action);

    expect(result).not.toBe(initialState);
    expect(initialState.layoutPreset).toBe(LayoutPresets.LINE_LENGTH);
  });
});
