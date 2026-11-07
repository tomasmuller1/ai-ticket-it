import { USUARIOS } from "../support/commands";

// El contenedor que se desplaza: el encabezado queda fuera, así que comparar contra la ventana no alcanza.
const contenedorDeScroll = (el) => {
  for (let nodo = el.parentElement; nodo; nodo = nodo.parentElement) {
    const { overflowY } = getComputedStyle(nodo);
    if ((overflowY === "auto" || overflowY === "scroll") && nodo.scrollHeight > nodo.clientHeight)
      return nodo;
  }
  throw new Error("El elemento no está dentro de un contenedor con scroll");
};

// El elemento tiene que estar dentro de lo que se ve del contenedor, sin desplazarse más.
const enPantalla = ($el) => {
  const visible = contenedorDeScroll($el[0]).getBoundingClientRect();
  const { top, bottom } = $el[0].getBoundingClientRect();
  expect(top, "borde de arriba").to.be.at.least(visible.top);
  expect(bottom, "borde de abajo").to.be.at.most(Math.min(visible.bottom, Cypress.config("viewportHeight")));
};

describe("Organizador (CU4 y CU2)", () => {
  beforeEach(() => {
    cy.iniciarSesion(USUARIOS.lucia);
  });

  it("crea un evento con un tipo de entrada y lo ve publicado", () => {
    cy.visit("/organizador/evento/nuevo");

    cy.campo("Nombre, obligatorio").first().type("Recital de prueba E2E");
    cy.campo("Descripción, obligatorio").type("Un evento creado por Cypress");
    cy.boton("Música").click();
    cy.campo("Lugar, obligatorio").type("La Trastienda");
    cy.campo("Nombre, obligatorio").last().type("General");
    cy.campo("Precio ($), obligatorio").type("1000");
    cy.campo("Cupo, obligatorio").type("50");
    cy.boton("Publicar evento").click();

    cy.location("pathname", { timeout: 15_000 }).should("match", /^\/organizador\/evento\/.+/);
    cy.contains("Recital de prueba E2E").should("be.visible");
    cy.contains("General").should("be.visible");
  });

  it("marca los errores si falta completar datos", () => {
    cy.visit("/organizador/evento/nuevo");

    cy.boton("Publicar evento").click();

    cy.contains("Revisá los campos marcados.").should("be.visible");
    cy.contains("Elegí una categoría.").should("be.visible");
  });

  it("al fallar, lleva la pantalla hasta el primer error", () => {
    cy.visit("/organizador/evento/nuevo");

    cy.boton("Publicar evento").click();

    cy.campo("Nombre, obligatorio").first().should(enPantalla);
  });

  it("también llega al error de la fecha", () => {
    cy.visit("/organizador/evento/nuevo");
    cy.campo("Nombre, obligatorio").first().type("Recital de prueba E2E");
    cy.campo("Descripción, obligatorio").type("Un evento creado por Cypress");
    cy.boton("Música").click();
    cy.campo("Fecha y hora").type("2020-01-01T10:00");
    cy.campo("Lugar, obligatorio").type("La Trastienda");
    cy.campo("Nombre, obligatorio").last().type("General");
    cy.campo("Precio ($), obligatorio").type("1000");
    cy.campo("Cupo, obligatorio").type("50");

    cy.boton("Publicar evento").click();

    cy.contains("La fecha tiene que ser futura.").should(enPantalla);
  });

  it("ve las compras de su evento con el estado de cada una", () => {
    cy.visit("/organizador/evento/e-rock-nacional");

    cy.contains("Noche de Rock Nacional").should("be.visible");
    cy.get('[aria-label^="Compra de Sofía"]').should("be.visible");
    cy.get('[aria-label^="Compra de Tomás"]').should("be.visible");
  });
});
