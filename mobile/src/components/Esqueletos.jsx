import { View } from "react-native";

import { espacio, radio } from "../theme";
import { AvisoError, BloqueCargando, Boton, Skeleton } from "./ui";

// Lo que ocupa una EventoCard mientras llega: la foto, la categoría, el nombre y la fecha.
export function EventoSkeleton() {
  return (
    <View style={{ gap: espacio.sm }}>
      <Skeleton alto={190} redondeo={radio.foto} />
      <Skeleton alto={12} ancho="30%" />
      <Skeleton alto={20} ancho="80%" />
      <Skeleton alto={14} ancho="50%" />
    </View>
  );
}

// Lo que ocupa una CompraCard mientras llega.
export function CompraSkeleton() {
  return <Skeleton alto={120} redondeo={radio.lg} />;
}

// Pie de una lista paginada (`lista` es el resultado de `useInfiniteQuery`): mientras llega la página
// siguiente se ve el esqueleto de lo que viene, en lugar de un spinner, para que nada salte al aparecer. Si
// falla, lo que ya se cargó se queda y se ofrece reintentar.
export function PieDeListaPaginada({ lista, etiqueta, style, children }) {
  if (lista.isFetchingNextPage) {
    return (
      <BloqueCargando etiqueta={etiqueta} style={style}>
        {children}
      </BloqueCargando>
    );
  }
  if (!lista.isFetchNextPageError) return null;
  return (
    <View style={[{ gap: espacio.sm, paddingVertical: espacio.lg }, style]}>
      <AvisoError>No pudimos cargar más</AvisoError>
      <Boton titulo="Reintentar" variante="secundario" onPress={() => lista.fetchNextPage()} />
    </View>
  );
}
