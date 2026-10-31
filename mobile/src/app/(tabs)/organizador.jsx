import { Pantalla } from "../../components/Pantalla";
import { EstadoVacio } from "../../components/ui";

// Se completa en la fase de pantallas del organizador.
export default function Organizador() {
  return (
    <Pantalla titulo="Mis eventos">
      <EstadoVacio
        icono="calendar-outline"
        titulo="Publicá tu primer evento"
        descripcion="Creá eventos con distintos tipos de entrada y seguí las ventas."
      />
    </Pantalla>
  );
}
