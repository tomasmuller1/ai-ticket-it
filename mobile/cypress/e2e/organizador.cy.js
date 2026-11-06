import { USUARIOS } from "../support/commands";

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

  it("ve las compras de su evento con el estado de cada una", () => {
    cy.visit("/organizador/evento/e-rock-nacional");

    cy.contains("Noche de Rock Nacional").should("be.visible");
    cy.get('[aria-label^="Compra de Sofía"]').should("be.visible");
    cy.get('[aria-label^="Compra de Tomás"]').should("be.visible");
  });
});
