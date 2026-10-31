import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { configurarSesion, guardarSesion, olvidarSesion, refrescarSesion } from "../api/client";
import { almacenamiento } from "../api/almacenamiento";
import { api } from "../api/endpoints";

const SesionContext = createContext(null);

// estado: "cargando" (restaurando la sesión guardada) | "anonimo" | "autenticado" | "sinConexion"
// ("sinConexion": hay una sesión guardada pero el backend no respondió; no se la da por cerrada).
export function SesionProvider({ children }) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState("cargando");
  const [usuario, setUsuario] = useState(null);

  const salir = useCallback(() => {
    setUsuario(null);
    setEstado("anonimo");
    queryClient.clear();
  }, [queryClient]);

  // Recupera la sesión con el refresh token guardado. Si el backend no responde, el token se conserva
  // y se ofrece reintentar: mostrar el login haría creer que la sesión se cerró.
  const restaurar = useCallback(() => {
    refrescarSesion()
      .then((sesion) => {
        if (sesion) {
          setUsuario(sesion.usuario);
          setEstado("autenticado");
        } else {
          setEstado("anonimo");
        }
      })
      .catch(() => setEstado("sinConexion"));
  }, []);

  useEffect(() => {
    configurarSesion({ alCerrarse: salir });
    restaurar();
  }, [salir, restaurar]);

  const reintentar = useCallback(() => {
    setEstado("cargando");
    restaurar();
  }, [restaurar]);

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

  const iniciarSesionConGoogle = useCallback(
    async (idToken) => entrar(await api.auth.google(idToken)),
    [entrar],
  );

  // Después de editar el perfil: la API devuelve el usuario actualizado.
  const actualizarUsuario = useCallback((nuevo) => setUsuario(nuevo), []);

  // Cambiar la contraseña cierra las otras sesiones y devuelve una nueva para este dispositivo.
  const cambiarContrasenia = useCallback(
    async (datos) => entrar(await api.auth.cambiarContrasenia(datos)),
    [entrar],
  );

  const cerrarSesion = useCallback(async () => {
    const refreshToken = await almacenamiento.obtenerRefreshToken();
    // Si el backend no responde igual se cierra la sesión en el dispositivo.
    await api.auth.logout(refreshToken).catch(() => {});
    await olvidarSesion();
    salir();
  }, [salir]);

  const valor = useMemo(
    () => ({
      estado,
      usuario,
      iniciarSesion,
      iniciarSesionConGoogle,
      registrarse,
      cerrarSesion,
      reintentar,
      actualizarUsuario,
      cambiarContrasenia,
    }),
    [
      estado,
      usuario,
      iniciarSesion,
      iniciarSesionConGoogle,
      registrarse,
      cerrarSesion,
      reintentar,
      actualizarUsuario,
      cambiarContrasenia,
    ],
  );

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error("useSesion tiene que usarse dentro de SesionProvider");
  return contexto;
}
