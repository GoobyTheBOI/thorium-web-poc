import { LAYOUT_CONSTANTS } from '@/lib/constants/uiConstants';

export enum LayoutPresets {
  LINE_LENGTH = "lineLength",
  MARGIN = "margin",
  FULL_WIDTH = "fullWidth",
  COLUMNS = "columns",
  NEWSPAPER = "newspaper",
  CUSTOM = "custom"
}

export const LAYOUT_PRESETS_VALUES = {
  [LayoutPresets.LINE_LENGTH]: LAYOUT_CONSTANTS.PRESET_VALUES.LINE_LENGTH,
  [LayoutPresets.MARGIN]: LAYOUT_CONSTANTS.PRESET_VALUES.MARGIN,
  [LayoutPresets.FULL_WIDTH]: LAYOUT_CONSTANTS.PRESET_VALUES.FULL_WIDTH,
  [LayoutPresets.COLUMNS]: LAYOUT_CONSTANTS.PRESET_VALUES.COLUMNS,
  [LayoutPresets.NEWSPAPER]: LAYOUT_CONSTANTS.PRESET_VALUES.NEWSPAPER
}