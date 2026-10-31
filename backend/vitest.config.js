import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Misma zona horaria en cualquier máquina (y en CI) para que las fechas del seed sean deterministas.
    env: { TZ: "America/Argentina/Buenos_Aires" },
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/server.js"],
      reporter: ["text", "html"],
    },
  },
});
