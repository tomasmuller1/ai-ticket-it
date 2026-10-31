import { Router } from "express";

export function eventosRoutes(eventosController) {
  const router = Router();
  router.get("/", eventosController.listar);
  router.get("/:id", eventosController.obtener);
  return router;
}
