import { USUARIOS } from "../support/commands";

describe("Comprar una entrada (CU3 y CU12)", () => {
  beforeEach(() => {
    cy.iniciarSesion(USUARIOS.valentina);
  });

  function reservarEntradaDeJazz() {
    cy.visit("/");
    // Cypress desplaza el elemento antes de hacer clic. El buscador está dentro de una lista con
    // keyboardDismissMode="on-drag" y, en web, cualquier scroll le saca el foco: `type` falla con un engañoso
    // "disabled element", porque después del clic no queda ningún elemento activo.
    cy.campo("Buscar eventos").type("Jazz", { scrollBehavior: false });
    cy.botonQueEmpieza("Jazz en el Club").click();
    cy.boton("Comprar entradas").click();
    cy.botonQueEmpieza("Reservar").click();
    // Al reservar, la hoja de pago se abre sola.
    cy.contains("Confirmá el pago").should("be.visible");
  }

  it("busca, reserva y paga: la compra queda confirmada", () => {
    reservarEntradaDeJazz();

    cy.botonQueEmpieza("Pagar").last().click();

    // El cobro es asincrónico: el anillo se ve mientras la app consulta el resultado.
    cy.contains("Procesando el pago").should("be.visible");
    cy.contains("Pago confirmado", { timeout: 20_000 }).should("be.visible");
    cy.estadoDeLaCompra("Confirmada").should("be.visible");
  });

  it("si la tarjeta se rechaza, explica el motivo y la reserva sigue pendiente", () => {
    reservarEntradaDeJazz();
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

  it("si cierra la hoja, la reserva sigue pendiente y puede pagar después", () => {
    reservarEntradaDeJazz();

    cy.boton("Cerrar el pago").last().click();

    // Se espera a que la hoja termine de cerrarse: mientras tanto hay dos botones "Pagar".
    cy.contains("Confirmá el pago").should("not.exist");
    cy.estadoDeLaCompra("Pendiente").should("be.visible");
    cy.botonQueEmpieza("Pagar").click();
    cy.contains("Confirmá el pago").should("be.visible");
  });
});
