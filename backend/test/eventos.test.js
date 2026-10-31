import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/app.js";

let server;
let baseUrl;

before(() => {
  server = createApp().listen(0);
  baseUrl = `http://localhost:${server.address().port}/api`;
});

after(() => server.close());

test("GET /health responde ok", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("GET /eventos lista los eventos con sus tipos de entrada", async () => {
  const res = await fetch(`${baseUrl}/eventos`);
  const eventos = await res.json();

  assert.equal(res.status, 200);
  assert.equal(eventos.length, 3);
  assert.equal(eventos[0].precioDesde, 35000);
  assert.equal(eventos[0].tiposEntrada[0].disponibles, 500);
});

test("GET /eventos/:id inexistente devuelve 404", async () => {
  const res = await fetch(`${baseUrl}/eventos/no-existe`);
  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /no-existe/);
});
