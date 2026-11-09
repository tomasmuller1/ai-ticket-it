import { USUARIOS } from "../support/commands";

describe("Gestión del evento (cancelar y posponer)", () => {
  it("el organizador cancela el evento y sus compras pagadas quedan reembolsadas; el comprador lo ve en sus avisos", () => {
    cy.iniciarSesion(USUARIOS.lucia);
    cy.visit("/organizador/evento/e-rock-nacional");

    cy.botonQueEmpieza("Cancelar evento").click();
    cy.campo("Motivo (opcional)").type("Problemas con el escenario");
    cy.boton("Cancelar evento").click();

    cy.contains("Cancelaste el evento. Estamos devolviendo el dinero.").should("be.visible");
    cy.contains("Cancelaste este evento. Les devolvemos el dinero a quienes pagaron.").should("be.visible");
    cy.contains("Gestión del evento").should("not.exist");
    cy.get('[aria-label^="Compra de Sofía"]').should("contain.text", "Reembolsada");
    cy.get('[aria-label^="Compra de Tomás"]').should("contain.text", "Reembolsada");

    // Sofía ve el aviso y llega a su compra reembolsada.
    cy.window().then((ventana) => ventana.localStorage.clear());
    cy.iniciarSesion(USUARIOS.sofia);
    cy.visit("/notificaciones");
    cy.botonQueEmpieza("Sin leer. Se canceló Noche de Rock Nacional").click();

    cy.textoEnPantalla("El organizador canceló el evento.").should("be.visible");
    cy.estadoDeLaCompra("Reembolsada").should("be.visible");
  });

  it("el organizador pospone un evento y los compradores lo ven como 'Nueva fecha' en Explorar", () => {
    cy.iniciarSesion(USUARIOS.martin);
    cy.visit("/organizador/evento/e-jazz-club");

    cy.botonQueEmpieza("Posponer").click();
    cy.campo("Motivo (opcional)").type("Por el clima");
    cy.boton("Posponer evento").click();

    cy.contains("Pospusimos el evento y les avisamos a los compradores").should("be.visible");

    cy.window().then((ventana) => ventana.localStorage.clear());
    cy.iniciarSesion(USUARIOS.sofia);
    cy.visit("/");
    cy.botonQueEmpieza("Jazz en el Club").should("contain.text", "Nueva fecha");
  });
});
