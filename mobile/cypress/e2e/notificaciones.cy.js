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
    // El texto también está en la lista (es el cuerpo de la notificación): primero, que se abrió el chat.
    cy.location("pathname").should("eq", "/compra/c-01/chat");
    cy.campo("Mensaje").should("be.visible");
    cy.textoEnPantalla("¿Se puede entrar con mochila?").should("be.visible");

    cy.go("back");
    cy.intercept("POST", "**/notificaciones/lectura").as("marcarTodas");
    cy.boton("Marcar todas como leídas").click();

    pestaniaAvisos().should("have.attr", "aria-label", "Notificaciones");
    pestaniaAvisos().invoke("text").should("not.match", /\d/);
    cy.contains("Estás al día").should("be.visible");
    // Lo de arriba puede ser solo el estado optimista: que el servidor lo haya guardado.
    cy.wait("@marcarTodas").then(({ request, response }) => {
      expect(request.body).to.deep.equal({});
      expect(response.statusCode).to.equal(200);
    });
    cy.pedirComo(USUARIOS.lucia, "GET", "/notificaciones/resumen").its("body.noLeidas").should("equal", 0);
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
    // Primero, el dato fresco: la notificación del mensaje nuevo solo existe después de volver a pedir la lista.
    // Sin esto, las aserciones de abajo pasarían con la lista vieja.
    cy.get('[role="button"][aria-label*="¿Y si llego tarde?"]')
      .should("have.attr", "aria-label")
      .and("not.match", /^Sin leer/);
    cy.contains("Estás al día").should("be.visible");
    cy.get('[aria-label^="Sin leer."]').should("not.exist");
    pestaniaAvisos().should("have.attr", "aria-label", "Notificaciones");
  });
});
