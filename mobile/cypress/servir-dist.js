const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

// Sirve la app exportada (`npx expo export --platform web`) para correr los E2E sin el servidor de desarrollo.
// `expo serve` responde 404 a una ruta como /evento/e-1 abierta directo, porque el dist tiene un solo
// index.html: acá, lo que no es un archivo cae en index.html y resuelve Expo Router.
// Se corre desde mobile/ con `npm run e2e:servir`.
const RAIZ = path.resolve("dist");
const PUERTO = 8081;
const TIPOS = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

http
  .createServer((req, res) => {
    const pedido = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const archivo = path.join(RAIZ, pedido);
    const existe = archivo.startsWith(RAIZ) && fs.statSync(archivo, { throwIfNoEntry: false })?.isFile();
    const destino = existe ? archivo : path.join(RAIZ, "index.html");
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(destino)] ?? "application/octet-stream" });
    fs.createReadStream(destino).pipe(res);
  })
  .listen(PUERTO, "localhost");
