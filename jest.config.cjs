module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@tailwindcss/vite$': '<rootDir>/src/__tests__/__mocks__/emptyMock.ts',
    '^@vitejs/plugin-react$': '<rootDir>/src/__tests__/__mocks__/emptyMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
};
