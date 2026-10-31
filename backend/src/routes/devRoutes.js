import { Router } from "express";

import { respuestaJson } from "../schemas/comunes.js";
import { z } from "../schemas/zod.js";

// Herramientas de desarrollo. createApp solo las monta fuera de producción.
export function devRoutes({ restaurarDatos }) {
  const router = Router();
  router.post("/reset", (req, res) => {
    restaurarDatos();
    res.json({ status: "ok" });
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
}
