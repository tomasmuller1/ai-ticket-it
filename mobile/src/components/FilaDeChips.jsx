import { ScrollView, View } from "react-native";

import { espacio } from "../theme";

// Fila horizontal de chips con scroll. Se envuelve en un View de alto fijo por el contenido para
// que los chips no se estiren (en web el ScrollView horizontal crece si el padre tiene espacio).
export function FilaDeChips({ children, margen = espacio.lg }) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: margen, gap: espacio.sm, alignItems: "center" }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
