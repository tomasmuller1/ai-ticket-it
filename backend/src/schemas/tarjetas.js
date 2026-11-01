import { z } from "./zod.js";

// Se aceptan espacios o guiones al escribir el número; se guardan solo los dígitos.
const numero = z
  .string()
  .transform((valor) => valor.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{13,19}$/, "El número de tarjeta tiene que tener entre 13 y 19 dígitos"))
  .openapi({ example: "4111 1111 1111 1111" });

export const TarjetaBody = z
  .object({
    numero,
    vencimiento: z
      .string()
      .trim()
      .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Usá el formato MM/AA")
      .openapi({ example: "12/30" }),
    // Se valida el formato pero no se guarda.
    cvv: z
      .string()
      .regex(/^\d{3,4}$/, "El código de seguridad tiene 3 o 4 dígitos")
      .openapi({ example: "123" }),
    titular: z.string().trim().min(2, "Escribí el nombre como figura en la tarjeta").max(60),
  })
  .openapi("NuevaTarjeta");

export const TarjetaRespuesta = z
  .object({
    id: z.string(),
    marca: z.string().openapi({ example: "Visa" }),
    ultimos4: z.string().openapi({ example: "4242" }),
    vencimiento: z.string().openapi({ example: "08/29" }),
    titular: z.string(),
  })
  .openapi("Tarjeta");

export const TarjetaParams = z.object({
  tarjetaId: z
    .string()
    .min(1)
    .openapi({ param: { name: "tarjetaId", in: "path" }, example: "t-sofia-visa" }),
});

export const PagoBody = z
  .object({ tarjetaId: z.string().min(1, "Elegí una tarjeta").openapi({ example: "t-sofia-visa" }) })
  .openapi("Pago");

export const PasarelaBody = z.object({ disponible: z.boolean() }).openapi("EstadoPasarela");
