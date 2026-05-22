import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js', 'src/**/__tests__/*.test.js', 'api/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  },
})
