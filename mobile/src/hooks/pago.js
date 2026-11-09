import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

import { almacenamiento } from "../api/almacenamiento";
import { api } from "../api/endpoints";
import { esReintentable } from "../api/reintentos";

// El cobro se resuelve en la pasarela después de responder el POST: la app consulta el resultado cada
// tanto, con un máximo de intentos (unos 60 segundos) para no dejar a la persona esperando sin fin.
export const POLLING_PAGO = { intervaloMs: 2000, maxConsultas: 30 };

const claveOperacion = (operacionId) => ["pagos", operacionId];

export function siguienteConsultaPago({ state }) {
  const { data, error, dataUpdateCount, errorUpdateCount } = state;
  if (data && data.estado !== "PENDIENTE") return false;
  if (error && !esReintentable(error)) return false;
  if (dataUpdateCount + errorUpdateCount >= POLLING_PAGO.maxConsultas) return false;
  return POLLING_PAGO.intervaloMs;
}

export function useOperacionPago(compraId, operacionId) {
  return useQuery({
    queryKey: claveOperacion(operacionId),
    queryFn: ({ signal }) => api.compras.operacionPago(compraId, operacionId, { signal }),
    enabled: Boolean(operacionId),
    refetchInterval: siguienteConsultaPago,
    // El polling ya reintenta: sumarle los reintentos de cada consulta multiplicaría las requests.
    retry: false,
    staleTime: 0,
  });
}

// Traduce el estado de la consulta a un resultado; null mientras haya que seguir esperando.
function resultadoDe(query) {
  const { data, error } = query.state;
  if (data?.estado === "APROBADA") return { tipo: "aprobado" };
  if (data?.estado === "RECHAZADA") return { tipo: "rechazado", motivo: data.motivo };
  if (siguienteConsultaPago(query) !== false) return null;
  return error ? { tipo: "incierto", error } : { tipo: "demorado" };
}

const eventoCanceladoEn = (compra) => compra?.evento?.estado === "CANCELADO";

// Con la operación resuelta, el organizador pudo haber cancelado el evento con el cobro en vuelo, y la compra que se
// pide ahora lo dice. Si se cobró, la compra termina REEMBOLSADA (o CANCELADA a la espera del reembolso) y no hay
// entradas válidas. Si se rechazó, no hay nada que reintentar: el próximo intento daría 409. Si no se puede
// consultar, se sigue con lo que se sabe (la compra y las notificaciones se refrescan igual). `compra` va en el
// resultado para no volver a pedirla.
async function conEstadoDelEvento(compraId, resultado) {
  if (resultado.tipo !== "aprobado" && resultado.tipo !== "rechazado") return resultado;
  const compra = await api.compras.detalle(compraId).catch(() => null);
  const eventoCancelado = eventoCanceladoEn(compra);
  if (resultado.tipo === "rechazado" && eventoCancelado) return { tipo: "eventoCancelado", compra };
  return { ...resultado, compra, eventoCancelado };
}

function useEsperarOperacion(compraId, operacionId, alResolver) {
  const queryClient = useQueryClient();
  const { dataUpdatedAt, errorUpdatedAt } = useOperacionPago(compraId, operacionId);
  const actualizada = Math.max(dataUpdatedAt, errorUpdatedAt);
  const resolver = useEffectEvent(async (resultado) =>
    alResolver(await conEstadoDelEvento(compraId, resultado)),
  );

  // `resolver` espera la consulta de la compra: si en ese lapso llega otra consulta de la operación (por ejemplo, un
  // refetch por foco), no se resuelve de nuevo. Se marca antes de esperar.
  const resueltas = useRef(new Set());

  useEffect(() => {
    if (!operacionId || !actualizada) return;
    const query = queryClient.getQueryCache().find({ queryKey: claveOperacion(operacionId) });
    const resultado = query && resultadoDe(query);
    if (!resultado || resueltas.current.has(operacionId)) return;
    resueltas.current.add(operacionId);
    resolver(resultado);
  }, [operacionId, actualizada, queryClient]);
}

// Aprobado o rechazado, el resultado del pago llega también como notificación.
function useInvalidarTrasElPago() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["compras"] });
    queryClient.invalidateQueries({ queryKey: ["eventos"] });
    queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
  };
}

// Todo el proceso de pagar una compra desde la hoja de pago. `alResolver` recibe { tipo }:
// - aprobado: el cobro salió. Con `eventoCancelado` el organizador canceló el evento mientras tanto: se devuelve el dinero.
// - rechazado: no salió y `motivo` explica por qué. El próximo intento es otra intención de pago.
// - eventoCancelado: el organizador canceló el evento y no se cobró nada (se rechazó, la API respondió 409
//   EVENTO_CANCELADO o se comprobó en la compra): no hay nada que reintentar.
// - noCobrado: la respuesta se perdió, pero se comprobó que no se llegó a cobrar. `reservaEnPie` es false si la API ya
//   no ofrece pagar (pasó la hora límite): igual se puede reintentar a mano, porque el pedido sin respuesta
//   todavía puede aceptarse.
// - vencida: el sistema canceló la reserva (se comprobó en la compra): no se llegó a cobrar ni se puede pagar.
// - demorado: se agotaron las consultas y sigue pendiente.
// - incierto: no se pudo averiguar qué pasó. Nunca se le dice a la persona que falló.
// - error: la API lo rechazó antes de intentar cobrar; `error` lo explica.
export function useProcesoDePago(compraId, alResolver) {
  const invalidar = useInvalidarTrasElPago();
  const intencion = useRef(null);
  const [iniciando, setIniciando] = useState(false);
  const [operacionId, setOperacionId] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const [eventoCancelado, setEventoCancelado] = useState(false);
  const pagar = useMutation({ mutationFn: api.compras.pagar });

  function terminar(resultado) {
    setIniciando(false);
    setOperacionId(null);
    setConfirmado(resultado.tipo === "aprobado");
    setEventoCancelado(Boolean(resultado.eventoCancelado));
    // Con estos dos todavía no se sabe qué pasó con el cobro: se retoma al volver a abrir la app.
    // Con un noCobrado pasada la hora límite (la reserva todavía no se canceló), el POST cortado puede llegar
    // después: el pago en curso sigue guardado.
    const puedeLlegarDespues = resultado.tipo === "noCobrado" && resultado.reservaEnPie === false;
    if (!["demorado", "incierto"].includes(resultado.tipo) && !puedeLlegarDespues) {
      almacenamiento.borrarPagoEnCurso();
    }
    if (["aprobado", "rechazado", "eventoCancelado"].includes(resultado.tipo)) intencion.current = null;
    invalidar();
    alResolver(resultado);
  }

  useEsperarOperacion(compraId, operacionId, terminar);

  function esperar(id) {
    setOperacionId(id);
    setIniciando(false);
    return almacenamiento.guardarPagoEnCurso({ compraId, operacionId: id });
  }

  // No se sabe si el cobro empezó (se cortó la conexión, por ejemplo): la compra dice qué pasó.
  async function averiguar() {
    try {
      const compra = await api.compras.detalle(compraId);
      const eventoCancelado = eventoCanceladoEn(compra);
      // Se cobró, pero el organizador canceló el evento con el cobro en vuelo: la compra terminó REEMBOLSADA o
      // CANCELADA a la espera del reembolso.
      if (eventoCancelado && compra.operacionPago?.estado === "APROBADA") {
        terminar({ tipo: "aprobado", eventoCancelado });
      } else if (compra.estado === "CONFIRMADA") terminar({ tipo: "aprobado", eventoCancelado });
      else if (compra.operacionPago?.estado === "PENDIENTE") await esperar(compra.operacionPago.operacionId);
      // Mientras no se cancele, el POST sin respuesta todavía puede llegar y aceptarse: no se da por vencida.
      else if (compra.reservaVencida) terminar({ tipo: "vencida" });
      // No se cobró y el evento ya no se hace: no hay nada que reintentar.
      else if (eventoCancelado) terminar({ tipo: "eventoCancelado" });
      else terminar({ tipo: "noCobrado", reservaEnPie: compra.acciones?.pagar === true });
    } catch {
      terminar({ tipo: "incierto" });
    }
  }

  async function iniciar(tarjetaId) {
    // La clave identifica la intención de pagar con esa tarjeta y se repite en cada reintento: si el pedido
    // anterior llegó al servidor, la API devuelve esa respuesta en lugar de cobrar otra vez.
    if (intencion.current?.tarjetaId !== tarjetaId) {
      intencion.current = { tarjetaId, clave: Crypto.randomUUID() };
    }
    setIniciando(true);
    await almacenamiento.guardarPagoEnCurso({ compraId, operacionId: null });
    try {
      const operacion = await pagar.mutateAsync({
        id: compraId,
        tarjetaId,
        clave: intencion.current.clave,
      });
      await esperar(operacion.operacionId);
    } catch (error) {
      if (error.status === 0 || error.codigo === "PAGO_EN_PROCESO") await averiguar();
      else if (error.codigo === "EVENTO_CANCELADO") terminar({ tipo: "eventoCancelado" });
      else terminar({ tipo: "error", error });
    }
  }

  return { iniciar, cobrando: iniciando || Boolean(operacionId) || confirmado, confirmado, eventoCancelado };
}

// Al abrir la app: si quedó un pago sin resolver (se cerró durante el cobro), sigue esperándolo.
export function useRetomarPago(alResolver) {
  const invalidar = useInvalidarTrasElPago();
  const [pago, setPago] = useState(null);

  async function terminar(resultado) {
    const compraId = pago?.compraId;
    setPago(null);
    invalidar();
    const yaNoExiste = resultado.error && !esReintentable(resultado.error);
    if (["aprobado", "rechazado", "eventoCancelado"].includes(resultado.tipo) || yaNoExiste) {
      almacenamiento.borrarPagoEnCurso();
    }
    if (resultado.error) return;
    // Con un rechazo se mira la compra que ya se pidió (conEstadoDelEvento): con el tiempo que pasó, la reserva pudo
    // vencer.
    const { compra } = resultado;
    if (resultado.tipo === "rechazado" && compraId && compra) {
      resultado = {
        ...resultado,
        reservaVencida: compra.reservaVencida,
        reservaEnPie: compra.acciones?.pagar === true,
      };
    }
    alResolver(resultado);
  }

  useEsperarOperacion(pago?.compraId, pago?.operacionId, terminar);

  const terminarAlAbrir = useEffectEvent(terminar);

  useEffect(() => {
    // Si no se llegó a saber el id de la operación, la compra lo dice.
    async function buscar() {
      const guardado = await almacenamiento.obtenerPagoEnCurso();
      if (!guardado) return;
      if (guardado.operacionId) {
        setPago(guardado);
        return;
      }
      const compra = await api.compras.detalle(guardado.compraId);
      const operacion = compra.operacionPago;
      const eventoCancelado = eventoCanceladoEn(compra);
      if (operacion?.estado === "PENDIENTE") {
        setPago({ compraId: guardado.compraId, operacionId: operacion.operacionId });
      } else if (eventoCancelado && operacion?.estado === "APROBADA") {
        // Se cobró y el evento se canceló: la compra está REEMBOLSADA o CANCELADA a la espera del reembolso.
        terminarAlAbrir({ tipo: "aprobado", eventoCancelado });
      } else if (compra.estado === "CONFIRMADA") {
        terminarAlAbrir({ tipo: "aprobado", eventoCancelado });
      } else {
        almacenamiento.borrarPagoEnCurso();
      }
    }
    // Sin conexión, queda guardado y se vuelve a intentar la próxima vez que se abra la app.
    buscar().catch(() => {});
  }, []);
}
