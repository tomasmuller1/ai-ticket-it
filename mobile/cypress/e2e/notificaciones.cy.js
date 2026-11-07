import { USUARIOS } from "../support/commands";

// La pestaña dice "Avisos" en la píldora, pero el lector (y aria-label en web) oye "Notificaciones" y la cantidad.
const pestaniaAvisos = () => cy.get('[role="tab"][aria-label^="Notificaciones"]');

describe("Notificaciones in-app", () => {
  it("la burbuja cuenta las no leídas, la notificación abre el chat y 'Marcar todas' la apaga", () => {
    cy.pedirComo(USUARIOS.sofia, "POST", "/compras/c-01/mensajes", {
      mensaje: "¿Se puede entrar con mochila?",
    });
    cy.pedirComo(USUARIOS.lucia, "GET", "/notificaciones/resumen").then(({ body: { noLeidas } }) => {
      expect(noLeidas).to.be.greaterThan(0);
      cy.iniciarSesion(USUARIOS.lucia);
      cy.visit("/");

      pestaniaAvisos()
        .should("have.attr", "aria-label", `Notificaciones, ${noLeidas} sin leer`)
        .and("contain.text", String(noLeidas));
    });

    pestaniaAvisos().click();
    cy.botonQueEmpieza("Sin leer. Sofía te escribió por Noche de Rock Nacional").click();
    cy.textoEnPantalla("¿Se puede entrar con mochila?").should("be.visible");

    cy.go("back");
    cy.boton("Marcar todas como leídas").click();

    pestaniaAvisos().should("have.attr", "aria-label", "Notificaciones");
    pestaniaAvisos().invoke("text").should("not.match", /\d/);
    cy.contains("Estás al día").should("be.visible");
  });

  it("con el chat abierto, lo que escribe la otra parte no queda sin leer", () => {
    cy.iniciarSesion(USUARIOS.lucia);
    cy.visit("/notificaciones");
    cy.botonQueEmpieza("Sin leer. Valentina te escribió").click();
    cy.textoEnPantalla("Hola, ¿la entrada VIP incluye estacionamiento?").should("be.visible");

    cy.pedirComo(USUARIOS.valentina, "POST", "/compras/c-03/mensajes", { mensaje: "¿Y si llego tarde?" });
    // Llega solo, por el polling del chat.
    cy.textoEnPantalla("¿Y si llego tarde?", { timeout: 15_000 }).should("be.visible");

    cy.go("back");
    cy.contains("Estás al día").should("be.visible");
    cy.get('[aria-label^="Sin leer."]').should("not.exist");
    pestaniaAvisos().should("have.attr", "aria-label", "Notificaciones");
  });
});
