import { createApp } from "./app.js";

const PORT = process.env.PORT ?? 3000;

// 0.0.0.0 para que el celular pueda conectarse por la red local.
createApp().listen(PORT, "0.0.0.0", () => {
  console.log(`AI Ticket It API escuchando en http://localhost:${PORT}`);
});
