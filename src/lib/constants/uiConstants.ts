/**
 * UI-related constants for consistent values across the application
 */

export const LAYOUT_CONSTANTS = {
  LINE_LENGTH_RANGE: {
    MIN: 20,
    MAX: 100,
    DEFAULT_STEP: 1
  },
  PRESET_VALUES: {
    LINE_LENGTH: {
      MIN: 40,
      OPTIMAL: 65,
      MAX: 75
    },
    MARGIN: {
      MIN: 40,
      OPTIMAL: 65,
      MAX: 65
    },
    FULL_WIDTH: {
      MIN: 40,
      OPTIMAL: 65,
      MAX: null
    },
    COLUMNS: {
      MIN: null,
      OPTIMAL: 65,
      MAX: 75
    },
    NEWSPAPER: {
      MIN: 30,
      OPTIMAL: 40,
      MAX: 50
    }
  }
} as const;

// Keyboard and interaction constants
export const INTERACTION_CONSTANTS = {
  THROTTLE: {
    TTS_START_MS: 1000  // Prevent rapid TTS start commands
  }
} as const;

// Coverage threshold constants
export const QUALITY_CONSTANTS = {
  COVERAGE_THRESHOLD: {
    BRANCHES: 70,
    FUNCTIONS: 70,
    LINES: 70,
    STATEMENTS: 70
  }
} as const;
