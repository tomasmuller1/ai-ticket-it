import { useMutation } from "@tanstack/react-query";

import { api } from "../api/endpoints";
import { useSesion } from "../context/SesionContext";

// La API devuelve el usuario actualizado y la sesión lo toma de ahí.
export function useActualizarPerfil() {
  const { actualizarUsuario } = useSesion();
  return useMutation({ mutationFn: api.usuarios.actualizar, onSuccess: actualizarUsuario });
}
