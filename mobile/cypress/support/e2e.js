import "./commands";

// Cada test arranca con los datos del seed y la pasarela prendida: no depende del orden ni de otros tests.
beforeEach(() => {
  cy.prepararDatos();
});
