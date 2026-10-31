import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Agrega .openapi() a Zod para documentar los schemas. Todos los schemas importan z desde acá.
extendZodWithOpenApi(z);

export { z };
