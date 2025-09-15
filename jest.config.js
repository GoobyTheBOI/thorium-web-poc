/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

// Define constants for coverage thresholds
const COVERAGE_THRESHOLD = {
  BRANCHES: 70,
  FUNCTIONS: 70,
  LINES: 70,
  STATEMENTS: 70,
};

module.exports = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",

  // Test environment
  testEnvironment: "jsdom",

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Transform files
  preset: "ts-jest",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },

  // Module resolution
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/components/(.*)$": "<rootDir>/src/components/$1",
    "^@/lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@/types/(.*)$": "<rootDir>/src/types/$1",
    "^@/preferences/(.*)$": "<rootDir>/src/preferences/$1",
    "^@/pages/(.*)$": "<rootDir>/src/pages/$1",
    "^@/app/(.*)$": "<rootDir>/src/app/$1",
    // Mock CSS modules
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    // Mock static assets
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },

  // Test patterns
  testMatch: [
    "**/__tests__/**/*.(ts|tsx|js|jsx)",
    "**/*.(test|spec).(ts|tsx|js|jsx)",
  ],

  // File extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Coverage settings
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/types/**/*",
    "!src/**/index.ts",
  ],

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],

  transformIgnorePatterns: ["/node_modules/(?!(@edrlab|@readium)/)"],
};
