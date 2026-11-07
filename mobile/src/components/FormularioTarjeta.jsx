import { useState } from "react";
import { View } from "react-native";

import { useAgregarTarjeta } from "../hooks/tarjetas";
import { useFocoEnError } from "../hooks/useFocoEnError";
import { formatearNumero, formatearVencimiento, marcaDe } from "../utils/tarjetas";
import { espacio } from "../theme";
import { VistaTarjeta } from "./VistaTarjeta";
import { AvisoError, Boton, Campo, LeyendaObligatorios, Texto } from "./ui";

// Agregar una tarjeta: la vista se completa en vivo mientras se escribe. El backend la tokeniza con la
// pasarela y guarda solo la marca y los últimos 4 dígitos.
export function FormularioTarjeta({ onGuardada, tituloBoton = "Guardar tarjeta" }) {
  const agregar = useAgregarTarjeta();
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [titular, setTitular] = useState("");
  const marca = marcaDe(numero);
  const { refDe, enfocarErrores } = useFocoEnError();

  function guardar() {
    agregar.mutate(
      { numero, vencimiento, cvv, titular },
      {
        onSuccess: (tarjeta) => onGuardada?.(tarjeta),
        onError: (e) => enfocarErrores(e.porCampo?.() ?? {}),
      },
    );
  }

  // Los errores de un campo van debajo de ese campo; el resto (por ejemplo, que la pasarela no responda)
  // va arriba del botón. Se muestran acá y no como aviso porque el formulario también vive en la hoja de
  // pago, que tapa los avisos.
  const error = agregar.error;
  const deCampo = (campo) => error?.errorDe?.(campo);
  const general = error && !error.detalles?.length ? error.message : null;

  return (
    <View style={{ gap: espacio.lg }}>
      <VistaTarjeta marca={marca} numero={numero} titular={titular} vencimiento={vencimiento} />
      <LeyendaObligatorios />
      <Campo
        ref={refDe("numero")}
        etiqueta="Número de tarjeta"
        obligatorio
        value={numero}
        onChangeText={(v) => setNumero(formatearNumero(v))}
        placeholder="0000 0000 0000 0000"
        keyboardType="number-pad"
        autoComplete="cc-number"
        textContentType="creditCardNumber"
        error={deCampo("numero")}
      />
      <View style={{ flexDirection: "row", gap: espacio.md }}>
        <Campo
          ref={refDe("vencimiento")}
          etiqueta="Vencimiento"
          obligatorio
          value={vencimiento}
          onChangeText={(v) => setVencimiento(formatearVencimiento(v))}
          placeholder="MM/AA"
          keyboardType="number-pad"
          autoComplete="cc-exp"
          error={deCampo("vencimiento")}
          style={{ flex: 1 }}
        />
        <Campo
          ref={refDe("cvv")}
          etiqueta="Código"
          obligatorio
          value={cvv}
          onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
          placeholder={marca === "American Express" ? "4 dígitos" : "3 dígitos"}
          keyboardType="number-pad"
          autoComplete="cc-csc"
          error={deCampo("cvv")}
          style={{ flex: 1 }}
        />
      </View>
      <Campo
        ref={refDe("titular")}
        etiqueta="Nombre del titular"
        obligatorio
        value={titular}
        onChangeText={setTitular}
        placeholder="Como figura en la tarjeta"
        autoComplete="cc-name"
        autoCapitalize="words"
        error={deCampo("titular")}
      />
      <AvisoError>{general}</AvisoError>
      <Boton titulo={tituloBoton} onPress={guardar} cargando={agregar.isPending} />
      <Texto variante="pequenio" color="secundario" style={{ textAlign: "center" }}>
        Pagos simulados: no se valida la tarjeta ni se cobra dinero real. No guardamos el número completo ni
        el código.
      </Texto>
    </View>
  );
}
