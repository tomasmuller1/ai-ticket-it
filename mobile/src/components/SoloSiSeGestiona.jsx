import { useState } from "react";
import { router } from "expo-router";

import { EstadoVacio } from "./ui";

// Posponer y cancelar solo valen para un evento programado o pospuesto: con uno cancelado o ya realizado (se llega
// con un enlace viejo, por ejemplo) se explica por qué en lugar de mostrar un formulario que la API va a rechazar.
// Se decide con el evento que había al abrir la pantalla: si cancelar termina bien, el evento pasa a CANCELADO y el
// formulario no puede desmontarse antes de avisar y volver.
export function SoloSiSeGestiona({ evento: actual, children }) {
  const [evento] = useState(actual);
  // `replace`, no `back`: con un enlace viejo no hay pantalla anterior a la que volver.
  const irAlEvento = () => router.replace(`/organizador/evento/${evento.id}`);
  if (evento.estado === "CANCELADO") {
    return (
      <EstadoVacio
        icono="close-circle-outline"
        titulo="Este evento ya se canceló"
        descripcion="No se puede cambiar nada de un evento cancelado."
        accion={{ titulo: "Volver al evento", onPress: irAlEvento }}
      />
    );
  }
  if (evento.finalizado) {
    return (
      <EstadoVacio
        icono="checkmark-done-outline"
        titulo="Este evento ya se realizó"
        descripcion="Un evento que ya pasó no se puede posponer ni cancelar."
        accion={{ titulo: "Volver al evento", onPress: irAlEvento }}
      />
    );
  }
  return children;
}
