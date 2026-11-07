import { servidor } from "./servidor";

Object.defineProperty(globalThis, "fetch", {
  value: globalThis.__fetchDeNode,
  writable: true,
  configurable: true,
});

// Una request sin handler es un error del test: así no se escapa nada a la red.
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());
