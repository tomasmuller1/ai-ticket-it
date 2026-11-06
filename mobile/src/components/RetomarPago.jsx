import { useRetomarPago } from "../hooks/pago";
import { useAvisos } from "./Avisos";

// Sin interfaz propia: cuenta cómo terminó un pago que quedó en proceso al cerrar la app.
export function RetomarPago() {
  const { avisar } = useAvisos();

  useRetomarPago(({ tipo, motivo }) => {
    if (tipo === "aprobado") {
      avisar({ tipo: "exito", titulo: "Tu pago se confirmó", mensaje: "Tus entradas ya son válidas." });
    } else if (tipo === "rechazado") {
      avisar({
        tipo: "error",
        titulo: "No pudimos cobrar",
        mensaje: `${motivo.mensaje} Tu reserva sigue en pie.`,
      });
    } else {
      avisar({ tipo: "info", titulo: "Tu pago sigue en proceso", mensaje: "Lo vas a ver en Mis entradas." });
    }
  });

  return null;
}
