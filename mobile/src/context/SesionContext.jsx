import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { configurarSesion, guardarSesion, olvidarSesion, refrescarSesion } from "../api/client";
import { almacenamiento } from "../api/almacenamiento";
import { api } from "../api/endpoints";

const SesionContext = createContext(null);

// estado: "cargando" (restaurando la sesión guardada) | "anonimo" | "autenticado"
export function SesionProvider({ children }) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState("cargando");
  const [usuario, setUsuario] = useState(null);

  const salir = useCallback(() => {
    setUsuario(null);
    setEstado("anonimo");
    queryClient.clear();
  }, [queryClient]);

  // Al abrir la app se intenta recuperar la sesión con el refresh token guardado.
  useEffect(() => {
    configurarSesion({ alCerrarse: salir });
    refrescarSesion()
      .then((sesion) => {
        if (sesion) {
          setUsuario(sesion.usuario);
          setEstado("autenticado");
        } else {
          setEstado("anonimo");
        }
      })
      .catch(() => setEstado("anonimo"));
  }, [salir]);

  const entrar = useCallback(async (sesion) => {
    await guardarSesion(sesion);
    setUsuario(sesion.usuario);
    setEstado("autenticado");
  }, []);

  const iniciarSesion = useCallback(
    async (credenciales) => entrar(await api.auth.login(credenciales)),
    [entrar],
  );

  const registrarse = useCallback(async (datos) => entrar(await api.auth.registrar(datos)), [entrar]);

  const cerrarSesion = useCallback(async () => {
    const refreshToken = await almacenamiento.obtenerRefreshToken();
    // Si el backend no responde igual se cierra la sesión en el dispositivo.
    await api.auth.logout(refreshToken).catch(() => {});
    await olvidarSesion();
    salir();
  }, [salir]);

  const valor = useMemo(
    () => ({ estado, usuario, iniciarSesion, registrarse, cerrarSesion }),
    [estado, usuario, iniciarSesion, registrarse, cerrarSesion],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error("useSesion tiene que usarse dentro de SesionProvider");
  return contexto;
}
