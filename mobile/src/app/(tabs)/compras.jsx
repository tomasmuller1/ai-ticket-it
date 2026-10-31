import { Pantalla } from "../../components/Pantalla";
import { EstadoVacio } from "../../components/ui";

// Se completa en la fase de pantallas del comprador.
export default function Compras() {
  return (
    <Pantalla titulo="Mis entradas">
      <EstadoVacio
        icono="ticket-outline"
        titulo="Todavía no tenés entradas"
        descripcion="Cuando compres, vas a ver acá el estado de cada compra."
      />
    </Pantalla>
  );
}
