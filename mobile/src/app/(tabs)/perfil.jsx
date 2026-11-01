import { useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../api/endpoints";

import { useAvisos } from "../../components/Avisos";
import { useEspacioBarra } from "../../components/BarraNavegacion";
import { FilaPanel, Panel } from "../../components/Panel";
import { Pantalla } from "../../components/Pantalla";
import { SelectorSegmentado } from "../../components/SelectorSegmentado";
import { Boton, Texto } from "../../components/ui";
import { useSesion } from "../../context/SesionContext";
import { useTarjetas } from "../../hooks/tarjetas";
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

// Solo en desarrollo: apagar la pasarela de pagos simulada para ver cómo responde la app cuando un
// servicio externo no anda (no se puede pagar ni reembolsar, pero el resto sigue funcionando).
function SimuladorPasarela() {
  const { colores } = useTema();
  const { avisar } = useAvisos();
  const queryClient = useQueryClient();
  const estado = useQuery({ queryKey: ["dev", "pasarela"], queryFn: api.dev.estadoPasarela });
  const cambiar = useMutation({
    mutationFn: api.dev.cambiarPasarela,
    onSuccess: (datos) => queryClient.setQueryData(["dev", "pasarela"], datos),
    onError: (error) =>
      avisar({ tipo: "error", titulo: "No pudimos cambiar la pasarela", mensaje: error.message }),
  });
  const disponible = cambiar.isPending ? cambiar.variables : (estado.data?.disponible ?? true);

  return (
    <Seccion titulo="Desarrollo">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: espacio.md,
          padding: espacio.lg,
          borderRadius: radio.md,
          backgroundColor: colores.superficieAlta,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Texto variante="cuerpoFuerte">Pasarela de pagos</Texto>
          <Texto variante="pequenio" color="secundario">
            {disponible
              ? "Funciona. Apagala para simular que no responde."
              : "Apagada: los pagos y los reembolsos fallan."}
          </Texto>
        </View>
        <Switch
          accessibilityLabel="Pasarela de pagos disponible"
          value={disponible}
          disabled={estado.isPending || estado.isError}
          onValueChange={(valor) => cambiar.mutate(valor)}
          trackColor={{ true: colores.acento, false: colores.bordeCampo }}
          thumbColor={colores.superficieAlta}
          activeThumbColor={colores.superficieAlta}
        />
      </View>
    </Seccion>
  );
}

export default function Perfil() {
  const { usuario, cerrarSesion } = useSesion();
  const { colores, preferencia, elegirTema } = useTema();
  const espacioBarra = useEspacioBarra();
  const tarjetas = useTarjetas();
  const cantidadTarjetas = tarjetas.data?.length;
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
            <FilaPanel
              icono="card-outline"
              titulo="Medios de pago"
              detalle={
                cantidadTarjetas === undefined
                  ? "Tus tarjetas guardadas"
                  : cantidadTarjetas === 0
                    ? "Todavía no guardaste tarjetas"
                    : `${cantidadTarjetas} ${cantidadTarjetas === 1 ? "tarjeta guardada" : "tarjetas guardadas"}`
              }
              onPress={() => router.push("/perfil/tarjetas")}
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

        {__DEV__ && <SimuladorPasarela />}

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
