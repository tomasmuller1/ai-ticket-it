import { Router } from "express";

import { validar } from "../middlewares/validar.js";
import { respuestaJson } from "../schemas/comunes.js";
import { PasarelaBody } from "../schemas/tarjetas.js";
import { z } from "../schemas/zod.js";

// Herramientas de desarrollo. createApp solo las monta fuera de producción.
export function devRoutes({ restaurarDatos, pasarelaPagos }) {
  const router = Router();
  router.post("/reset", (req, res) => {
    restaurarDatos();
    res.json({ status: "ok" });
  });
  // Simula que la pasarela de pagos se cae (o vuelve): sirve para mostrar que sin pagos el resto de la
  // app sigue funcionando.
  router.get("/pasarela", (req, res) => res.json({ disponible: pasarelaPagos.disponible !== false }));
  router.post("/pasarela", validar({ body: PasarelaBody }), (req, res) => {
    pasarelaPagos.cambiarDisponibilidad?.(req.validado.body.disponible);
    res.json({ disponible: pasarelaPagos.disponible !== false });
  });
  return router;
}

export function documentarDev(registro) {
  registro.registerPath({
    method: "post",
    path: "/api/dev/reset",
    tags: ["Desarrollo"],
    summary: "Restaurar los datos de ejemplo (solo desarrollo)",
    responses: { 200: respuestaJson("Datos restaurados", z.object({ status: z.literal("ok") })) },
  });

  registro.registerPath({
    method: "get",
    path: "/api/dev/pasarela",
    tags: ["Desarrollo"],
    summary: "Ver si la pasarela de pagos simulada está disponible (solo desarrollo)",
    responses: { 200: respuestaJson("Estado de la pasarela", PasarelaBody) },
  });

  registro.registerPath({
    method: "post",
    path: "/api/dev/pasarela",
    tags: ["Desarrollo"],
    summary: "Simular la caída de la pasarela de pagos (solo desarrollo)",
    description:
      "Con disponible=false los pagos, reembolsos y tarjetas nuevas responden 503 PASARELA_NO_DISPONIBLE; el resto de la API sigue funcionando.",
    request: { body: { content: { "application/json": { schema: PasarelaBody } } } },
    responses: { 200: respuestaJson("Estado de la pasarela", PasarelaBody) },
  });
}
