import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";

import { useEspacioBarra } from "../../components/BarraNavegacion";
import { FilaPanel, Panel } from "../../components/Panel";
import { Pantalla } from "../../components/Pantalla";
import { SelectorSegmentado } from "../../components/SelectorSegmentado";
import { Boton, Texto } from "../../components/ui";
import { useSesion } from "../../context/SesionContext";
import { confirmar } from "../../utils/confirmar";
import { espacio, radio, useTema } from "../../theme";

const TEMAS = [
  { valor: "sistema", etiqueta: "Automático", icono: "phone-portrait-outline" },
  { valor: "claro", etiqueta: "Claro", icono: "sunny-outline" },
  { valor: "oscuro", etiqueta: "Oscuro", icono: "moon-outline" },
];

function Seccion({ titulo, children }) {
  return (
    <View style={{ gap: espacio.md }}>
      <Texto variante="subtitulo" accessibilityRole="header">
        {titulo}
      </Texto>
      {children}
    </View>
  );
}

export default function Perfil() {
  const { usuario, cerrarSesion } = useSesion();
  const { colores, preferencia, elegirTema } = useTema();
  const espacioBarra = useEspacioBarra();
  const [saliendo, setSaliendo] = useState(false);
  const iniciales = `${usuario.nombre[0] ?? ""}${usuario.apellido[0] ?? ""}`.toUpperCase();

  return (
    <Pantalla titulo="Perfil">
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, paddingBottom: espacioBarra, gap: espacio.xl }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: espacio.lg,
            padding: espacio.lg,
            borderRadius: radio.md,
            backgroundColor: colores.superficieAlta,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radio.pill,
              backgroundColor: colores.acento,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Texto variante="titulo" color="sobreAcento" style={{ fontSize: 28, lineHeight: 30 }}>
              {iniciales}
            </Texto>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="subtitulo" numberOfLines={1}>
              {usuario.nombre} {usuario.apellido}
            </Texto>
            <Texto color="secundario" numberOfLines={1}>
              {usuario.email}
            </Texto>
          </View>
        </View>

        <Seccion titulo="Tu cuenta">
          <Panel>
            <FilaPanel
              icono="person-outline"
              titulo="Tus datos"
              detalle="Nombre, email y contraseña"
              onPress={() => router.push("/perfil/editar")}
            />
          </Panel>
        </Seccion>

        <Seccion titulo="Apariencia">
          <SelectorSegmentado
            etiqueta="Tema de la app"
            opciones={TEMAS}
            valor={preferencia}
            onCambiar={elegirTema}
          />
          <Texto variante="pequenio" color="secundario">
            {preferencia === "sistema"
              ? "Usa el mismo tema que tu celular."
              : `La app queda en tema ${preferencia} aunque tu celular use otro.`}
          </Texto>
        </Seccion>

        <Boton
          titulo="Cerrar sesión"
          variante="peligroSutil"
          icono="log-out-outline"
          cargando={saliendo}
          onPress={() =>
            confirmar({
              titulo: "¿Cerrar sesión?",
              mensaje: "Vas a tener que volver a ingresar para ver tus entradas.",
              accion: "Cerrar sesión",
              volver: "Seguir conectado",
              destructiva: true,
              alConfirmar: async () => {
                setSaliendo(true);
                await cerrarSesion();
              },
            })
          }
        />
      </ScrollView>
    </Pantalla>
  );
}
