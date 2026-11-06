import { USUARIOS } from "../support/commands";

describe("Comprar una entrada (CU3 y CU12)", () => {
  beforeEach(() => {
    cy.iniciarSesion(USUARIOS.valentina);
  });

  function reservarEntradaDeJazz() {
    cy.intercept("GET", "**/api/eventos*").as("eventos");
    cy.visit("/");
    // Si se hace clic mientras el inicio se está montando, el buscador pierde el foco y `type` falla. Cypress
    // lo informa como "disabled element" porque, después del clic, no hay ningún elemento activo.
    cy.wait("@eventos");
    cy.contains("Hola, Valentina").should("be.visible");
    cy.campo("Buscar eventos").type("Jazz");
    cy.botonQueEmpieza("Jazz en el Club").click();
    cy.boton("Comprar entradas").click();
    cy.botonQueEmpieza("Reservar").click();
    cy.estadoDeLaCompra("Pendiente").should("be.visible");
  }

  it("busca, reserva y paga: la compra queda confirmada", () => {
    reservarEntradaDeJazz();

    cy.botonQueEmpieza("Pagar").click();
    cy.contains("Confirmá el pago").should("be.visible");
    cy.botonQueEmpieza("Pagar").last().click();

    // El cobro es asincrónico: el anillo se ve mientras la app consulta el resultado.
    cy.contains("Procesando el pago").should("be.visible");
    cy.contains("Pago confirmado", { timeout: 20_000 }).should("be.visible");
    cy.estadoDeLaCompra("Confirmada").should("be.visible");
  });

  it("si la tarjeta se rechaza, explica el motivo y la reserva sigue pendiente", () => {
    reservarEntradaDeJazz();
    cy.botonQueEmpieza("Pagar").click();
    cy.botonQueEmpieza("Pagás con").click();
    cy.boton("Agregar otra tarjeta").click();
    cy.campo("Número de tarjeta, obligatorio").type("4000000000000002");
    cy.campo("Vencimiento, obligatorio").type("1230");
    cy.campo("Código, obligatorio").type("123");
    cy.campo("Nombre del titular, obligatorio").type("Valentina Prueba");
    cy.boton("Guardar tarjeta").click();

    cy.botonQueEmpieza("Pagar").last().click();

    cy.contains("La tarjeta fue rechazada", { timeout: 20_000 }).should("be.visible");
    cy.boton("Cerrar el pago").last().click();
    cy.estadoDeLaCompra("Pendiente").should("be.visible");
  });
});
