import { useRetomarPago } from "../hooks/pago";
import { PAGO_DE_EVENTO_CANCELADO } from "../utils/estados";
import { useAvisos } from "./Avisos";

// Sin interfaz propia: cuenta cómo terminó un pago que quedó en proceso al cerrar la app.
export function RetomarPago() {
  const { avisar } = useAvisos();

  useRetomarPago(({ tipo, motivo, reservaVencida, reservaEnPie, eventoCancelado }) => {
    if (tipo === "aprobado" && eventoCancelado) {
      avisar({
        tipo: "info",
        titulo: PAGO_DE_EVENTO_CANCELADO.titulo,
        mensaje: PAGO_DE_EVENTO_CANCELADO.conCobro,
        duracion: 8000,
      });
    } else if (tipo === "eventoCancelado") {
      avisar({
        tipo: "info",
        titulo: PAGO_DE_EVENTO_CANCELADO.titulo,
        mensaje: PAGO_DE_EVENTO_CANCELADO.sinCobro,
        duracion: 8000,
      });
    } else if (tipo === "aprobado") {
      avisar({ tipo: "exito", titulo: "Tu pago se confirmó", mensaje: "Tus entradas ya son válidas." });
    } else if (tipo === "rechazado") {
      avisar({
        tipo: "error",
        titulo: "No pudimos cobrar",
        mensaje: reservaVencida
          ? `${motivo.mensaje} La reserva venció y las entradas se liberaron.`
          : reservaEnPie
            ? `${motivo.mensaje} Tu reserva sigue en pie.`
            : motivo.mensaje,
      });
    } else {
      avisar({ tipo: "info", titulo: "Tu pago sigue en proceso", mensaje: "Lo vas a ver en Mis entradas." });
    }
  });

  return null;
}
