import { USUARIOS } from "../support/commands";

describe("Pasarela de pagos caída", () => {
  it("avisa sin perder la reserva y, cuando vuelve, el pago sale", () => {
    cy.iniciarSesion(USUARIOS.sofia);
    cy.cambiarPasarela(false);
    cy.visit("/compra/c-04");

    cy.botonQueEmpieza("Pagar").click();
    cy.botonQueEmpieza("Pagar").last().click();

    cy.contains("No pudimos cobrar", { timeout: 20_000 }).should("be.visible");
    cy.contains("Tu reserva sigue en pie").should("be.visible");
    cy.estadoDeLaCompra("Pendiente").should("be.visible");

    cy.cambiarPasarela(true);
    cy.boton("Cerrar aviso").click();
    cy.botonQueEmpieza("Pagar").click();
    cy.botonQueEmpieza("Pagar").last().click();

    cy.contains("Pago confirmado", { timeout: 20_000 }).should("be.visible");
    cy.estadoDeLaCompra("Confirmada").should("be.visible");
  });
});
