import { vaciar } from "./secureStoreFalso";
import { servidor } from "./servidor";

Object.defineProperty(globalThis, "fetch", {
  value: globalThis.__fetchDeNode,
  writable: true,
  configurable: true,
});

// Una request sin handler es un error del test: así no se escapa nada a la red.
beforeAll(() => servidor.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  servidor.resetHandlers();
  vaciar();
});
afterAll(() => servidor.close());
