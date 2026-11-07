import { render } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AvisosProvider } from "../../src/components/Avisos";
import { resolverTema, TemaContext } from "../../src/theme";

const METRICAS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const TEMA = { ...resolverTema("claro", "light"), preferencia: "claro", elegirTema: () => {}, listo: true };

// Sin reintentos: cada test decide qué responde la API y no tiene que esperar los backoff de la app.
export function crearQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function Proveedores({ children, queryClient = crearQueryClient() }) {
  return (
    <SafeAreaProvider initialMetrics={METRICAS}>
      <TemaContext.Provider value={TEMA}>
        <QueryClientProvider client={queryClient}>
          <AvisosProvider>{children}</AvisosProvider>
        </QueryClientProvider>
      </TemaContext.Provider>
    </SafeAreaProvider>
  );
}

// Renderiza un componente con los mismos proveedores que tiene en la app.
export async function renderConProveedores(ui, { queryClient = crearQueryClient() } = {}) {
  const resultado = await render(<Proveedores queryClient={queryClient}>{ui}</Proveedores>);
  return { ...resultado, queryClient };
}
