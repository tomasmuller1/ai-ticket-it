import { USUARIOS } from "../support/commands";

const disponiblesDeCampo = () =>
  cy
    .request(`${Cypress.expose("apiUrl")}/eventos/e-rock-nacional`)
    .then(({ body }) => body.tiposEntrada.find((tipo) => tipo.nombre === "Campo").disponibles);

describe("Cancelar una compra pagada (CU7)", () => {
  it("pide confirmación, reembolsa y vuelve el cupo", () => {
    cy.iniciarSesion(USUARIOS.sofia);
    disponiblesDeCampo().then((antes) => {
      cy.on("window:confirm", (texto) => {
        expect(texto).to.contain("¿Cancelar la compra?");
        expect(texto).to.contain("Te devolvemos");
        return true;
      });
      cy.visit("/compra/c-01");

      cy.boton("Cancelar compra").click();

      cy.estadoDeLaCompra("Reembolsada").should("be.visible");
      disponiblesDeCampo().should("eq", antes + 2);
    });
  });

  it("si se elige no cancelar, la compra queda como estaba", () => {
    cy.iniciarSesion(USUARIOS.sofia);
    cy.on("window:confirm", () => false);
    cy.visit("/compra/c-01");

    cy.boton("Cancelar compra").click();

    cy.estadoDeLaCompra("Confirmada").should("be.visible");
  });
});
