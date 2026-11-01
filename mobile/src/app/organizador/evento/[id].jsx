import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { CompraCard } from "../../../components/CompraCard";
import { FilaDeChips } from "../../../components/FilaDeChips";
import { Indicador, Medidor } from "../../../components/Medidor";
import { Panel } from "../../../components/Panel";
import { Boton, Chip, EstadoError, EstadoVacio, Skeleton, Texto } from "../../../components/ui";
import { useComprasDeEvento } from "../../../hooks/organizador";
import { formato } from "../../../utils/formato";
import { FILTROS_ESTADO } from "../../../utils/estados";
import { espacio, radio, useTema } from "../../../theme";

// Estados en los que la compra está paga y no se devolvió la plata.
const COBRADAS = ["CONFIRMADA", "UTILIZADA"];

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

function GestionSkeleton() {
  const { colores } = useTema();
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo, padding: espacio.lg, gap: espacio.md }}>
      <Skeleton alto={34} ancho="75%" />
      <Skeleton alto={16} ancho="40%" />
      <View style={{ flexDirection: "row", gap: espacio.md, marginTop: espacio.lg }}>
        <Skeleton alto={84} ancho="48%" redondeo={radio.md} />
        <Skeleton alto={84} ancho="48%" redondeo={radio.md} />
      </View>
      <Skeleton alto={150} redondeo={radio.md} style={{ marginTop: espacio.lg }} />
    </View>
  );
}

// CU2: el organizador ve las compras de su evento y cuántas entradas quedan de cada tipo.
// Desde cada compra puede validar la entrada y responder el chat (CU6).
export default function GestionEvento() {
  const { id } = useLocalSearchParams();
  const { colores } = useTema();
  const [estado, setEstado] = useState(undefined);
  const consulta = useComprasDeEvento(id);

  if (consulta.isPending) return <GestionSkeleton />;
  if (consulta.isError) return <EstadoError error={consulta.error} onReintentar={consulta.refetch} />;

  const { evento, resumenPorTipo, compras } = consulta.data;
  const cupo = resumenPorTipo.reduce((total, tipo) => total + tipo.cupo, 0);
  const vendidas = resumenPorTipo.reduce((total, tipo) => total + tipo.vendidas, 0);
  const recaudado = compras
    .filter((c) => COBRADAS.includes(c.estado))
    .reduce((total, c) => total + c.total, 0);
  const filtradas = compras.filter((c) => !estado || c.estado === estado);
  const cantidadPor = (e) => compras.filter((c) => !e || c.estado === e).length;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: espacio.xxxl }}
      >
        <View style={{ gap: espacio.xs }}>
          <Texto variante="titulo" accessibilityRole="header">
            {evento.nombre}
          </Texto>
          <Texto variante="etiqueta" color="secundario">
            {formato.fecha(evento.fecha)}
          </Texto>
        </View>

        <View style={{ flexDirection: "row", gap: espacio.md }}>
          <Indicador
            etiqueta="entradas vendidas"
            valor={`${vendidas} de ${cupo}`}
            detalle={`${cupo - vendidas} libres`}
          />
          <Indicador etiqueta="recaudado" valor={formato.monto(recaudado)} />
        </View>

        <Seccion titulo="Ventas por tipo de entrada">
          <Panel>
            {resumenPorTipo.map((tipo) => (
              <View key={tipo.tipoEntradaId} style={{ padding: espacio.lg }}>
                <Medidor
                  etiqueta={tipo.nombre}
                  valor={tipo.vendidas}
                  total={tipo.cupo}
                  detalle={`${tipo.disponibles} ${tipo.disponibles === 1 ? "libre" : "libres"}, ${formato.precio(tipo.precio)} cada una`}
                />
              </View>
            ))}
          </Panel>
        </Seccion>

        <Seccion titulo="Compras">
          <FilaDeChips margen={0}>
            {FILTROS_ESTADO.map((filtro) => (
              <Chip
                key={filtro.etiqueta}
                titulo={`${filtro.etiqueta} (${cantidadPor(filtro.estado)})`}
                seleccionado={estado === filtro.estado}
                onPress={() => setEstado(filtro.estado)}
              />
            ))}
          </FilaDeChips>
          {filtradas.length === 0 ? (
            <EstadoVacio
              icono="receipt-outline"
              titulo={estado ? "Ninguna compra en este estado" : "Todavía no hay compras"}
              descripcion={
                estado ? "Probá con otro filtro." : "Cuando alguien compre entradas las vas a ver acá."
              }
            />
          ) : (
            <View style={{ gap: espacio.md }}>
              {filtradas.map((compra) => (
                <CompraCard
                  key={compra.id}
                  compra={compra}
                  mostrarComprador
                  onPress={() => router.push(`/compra/${compra.id}`)}
                />
              ))}
            </View>
          )}
        </Seccion>

        <Boton
          titulo="Ver cómo lo ven los compradores"
          variante="secundario"
          icono="eye-outline"
          onPress={() => router.push(`/evento/${evento.id}`)}
        />
      </ScrollView>
    </View>
  );
}
