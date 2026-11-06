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

function useEsperarOperacion(compraId, operacionId, alResolver) {
  const queryClient = useQueryClient();
  const { dataUpdatedAt, errorUpdatedAt } = useOperacionPago(compraId, operacionId);
  const actualizada = Math.max(dataUpdatedAt, errorUpdatedAt);
  const resolver = useEffectEvent(alResolver);

  useEffect(() => {
    if (!operacionId || !actualizada) return;
    const query = queryClient.getQueryCache().find({ queryKey: claveOperacion(operacionId) });
    const resultado = query && resultadoDe(query);
    if (resultado) resolver(resultado);
  }, [operacionId, actualizada, queryClient]);
}

function useInvalidarTrasElPago() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["compras"] });
    queryClient.invalidateQueries({ queryKey: ["eventos"] });
  };
}

// Todo el proceso de pagar una compra desde la hoja de pago. `alResolver` recibe { tipo }:
// - aprobado: el cobro salió.
// - rechazado: no salió y `motivo` explica por qué. El próximo intento es otra intención de pago.
// - noCobrado: la respuesta se perdió, pero se comprobó que no se llegó a cobrar. `reservaEnPie` dice si todavía
//   se puede pagar.
// - vencida: la reserva venció (se comprobó en la compra): no se puede pagar.
// - demorado: se agotaron las consultas y sigue pendiente.
// - incierto: no se pudo averiguar qué pasó. Nunca se le dice a la persona que falló.
// - error: la API lo rechazó antes de intentar cobrar; `error` lo explica.
export function useProcesoDePago(compraId, alResolver) {
  const invalidar = useInvalidarTrasElPago();
  const intencion = useRef(null);
  const [iniciando, setIniciando] = useState(false);
  const [operacionId, setOperacionId] = useState(null);
  const [confirmado, setConfirmado] = useState(false);
  const pagar = useMutation({ mutationFn: api.compras.pagar });

  function terminar(resultado) {
    setIniciando(false);
    setOperacionId(null);
    setConfirmado(resultado.tipo === "aprobado");
    // Con estos dos todavía no se sabe qué pasó con el cobro: se retoma al volver a abrir la app.
    // Con un noCobrado de una reserva sin plazo, el POST cortado puede llegar después: sigue guardado.
    const puedeLlegarDespues = resultado.tipo === "noCobrado" && resultado.reservaEnPie === false;
    if (!["demorado", "incierto"].includes(resultado.tipo) && !puedeLlegarDespues) {
      almacenamiento.borrarPagoEnCurso();
    }
    if (resultado.tipo === "aprobado" || resultado.tipo === "rechazado") intencion.current = null;
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
      if (compra.estado === "CONFIRMADA") terminar({ tipo: "aprobado" });
      else if (compra.operacionPago?.estado === "PENDIENTE") await esperar(compra.operacionPago.operacionId);
      // Si sigue PENDIENTE, el POST sin respuesta todavía puede llegar y aceptarse: no se da por vencida.
      else if (compra.estado !== "PENDIENTE" && compra.reservaVencida) terminar({ tipo: "vencida" });
      else terminar({ tipo: "noCobrado", reservaEnPie: compra.acciones?.pagar !== false });
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
      else terminar({ tipo: "error", error });
    }
  }

  return { iniciar, cobrando: iniciando || Boolean(operacionId) || confirmado, confirmado };
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
    if (resultado.tipo === "aprobado" || resultado.tipo === "rechazado" || yaNoExiste) {
      almacenamiento.borrarPagoEnCurso();
    }
    if (resultado.error) return;
    // Con un rechazo se consulta la compra: con el tiempo que pasó, la reserva pudo vencer.
    if (resultado.tipo === "rechazado" && compraId) {
      const compra = await api.compras.detalle(compraId).catch(() => null);
      if (compra) {
        resultado = {
          ...resultado,
          reservaVencida: compra.reservaVencida,
          reservaEnPie: compra.acciones?.pagar !== false,
        };
      }
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
      if (operacion?.estado === "PENDIENTE") {
        setPago({ compraId: guardado.compraId, operacionId: operacion.operacionId });
      } else if (compra.estado === "CONFIRMADA") {
        terminarAlAbrir({ tipo: "aprobado" });
      } else {
        almacenamiento.borrarPagoEnCurso();
      }
    }
    // Sin conexión, queda guardado y se vuelve a intentar la próxima vez que se abra la app.
    buscar().catch(() => {});
  }, []);
}
