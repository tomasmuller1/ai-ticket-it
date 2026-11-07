import { USUARIOS } from "../support/commands";

describe("Chat de una compra (CU5 y CU6)", () => {
  it("envía un mensaje y la respuesta aparece sola, por el polling", () => {
    cy.iniciarSesion(USUARIOS.sofia);
    cy.visit("/compra/c-01/chat");

    cy.campo("Mensaje").type("¿Se puede entrar con mochila?");
    cy.boton("Enviar mensaje").click();
    cy.contains("¿Se puede entrar con mochila?").should("be.visible");

    cy.pedirComo(USUARIOS.lucia, "POST", "/compras/c-01/mensajes", { mensaje: "Sí, sin problema." });

    cy.contains("Sí, sin problema.", { timeout: 15_000 }).should("be.visible");
  });
});
