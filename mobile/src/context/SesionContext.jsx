import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { configurarSesion, guardarSesion, olvidarSesion, refrescarSesion } from "../api/client";
import { almacenamiento } from "../api/almacenamiento";
import { api } from "../api/endpoints";
import { esReintentable } from "../api/reintentos";

const SesionContext = createContext(null);

// estado: "cargando" (restaurando la sesión guardada) | "anonimo" | "autenticado" | "sinConexion"
// ("sinConexion": hay una sesión guardada pero el backend no respondió; no se la da por cerrada).
// sesionVencida: la sesión se cerró sola (no la cerró la persona); el login se lo explica.
export function SesionProvider({ children }) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState("cargando");
  const [usuario, setUsuario] = useState(null);
  const [errorConexion, setErrorConexion] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const salir = useCallback(() => {
    setUsuario(null);
    setEstado("anonimo");
    queryClient.clear();
  }, [queryClient]);

  const alVencerse = useCallback(() => {
    setSesionVencida(true);
    salir();
  }, [salir]);

  // Recupera la sesión con el refresh token guardado. Si el backend no responde, el token se conserva
  // y se ofrece reintentar: mostrar el login haría creer que la sesión se cerró.
  const restaurar = useCallback(() => {
    let habiaSesion = false;
    almacenamiento
      .obtenerRefreshToken()
      .then((token) => {
        habiaSesion = Boolean(token);
        return refrescarSesion();
      })
      .then((sesion) => {
        if (sesion) {
          setUsuario(sesion.usuario);
          setEstado("autenticado");
        } else {
          setSesionVencida(habiaSesion);
          setEstado("anonimo");
        }
      })
      .catch((error) => {
        if (esReintentable(error)) {
          setErrorConexion(error);
          setEstado("sinConexion");
        } else {
          // Reintentar no lo arreglaría: mejor el login que una pantalla sin salida.
          setEstado("anonimo");
        }
      });
  }, []);

  useEffect(() => {
    configurarSesion({ alCerrarse: alVencerse });
    restaurar();
  }, [alVencerse, restaurar]);

  const reintentar = useCallback(() => {
    setEstado("cargando");
    restaurar();
  }, [restaurar]);

  const entrar = useCallback(async (sesion) => {
    await guardarSesion(sesion);
    setSesionVencida(false);
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
      errorConexion,
      sesionVencida,
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
      errorConexion,
      sesionVencida,
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
