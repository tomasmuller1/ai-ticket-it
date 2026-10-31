import { Pantalla } from "../../components/Pantalla";
import { EstadoVacio } from "../../components/ui";

// Se completa en la fase de pantallas del comprador.
export default function Favoritos() {
  return (
    <Pantalla titulo="Favoritos">
      <EstadoVacio
        icono="heart-outline"
        titulo="Tus favoritos van a aparecer acá"
        descripcion="Tocá el corazón en un evento para guardarlo."
      />
    </Pantalla>
  );
}
