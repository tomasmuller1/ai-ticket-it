import { CONTRASENIA, USUARIOS } from "../support/commands";

describe("Autenticación", () => {
  it("con los datos correctos llega al inicio y saluda por el nombre", () => {
    cy.visit("/login");

    cy.campo("Email, obligatorio").type(USUARIOS.sofia);
    cy.campo("Contraseña, obligatorio").type(CONTRASENIA);
    cy.boton("Iniciar sesión").click();

    cy.contains("Hola, Sofía").should("be.visible");
  });

  it("con la contraseña incorrecta muestra el error y sigue en el login", () => {
    cy.visit("/login");

    cy.campo("Email, obligatorio").type(USUARIOS.sofia);
    cy.campo("Contraseña, obligatorio").type("incorrecta1");
    cy.boton("Iniciar sesión").click();

    cy.contains("Email o contraseña incorrectos").should("be.visible");
    cy.location("pathname").should("eq", "/login");
  });

  it("el registro con datos inválidos muestra un mensaje junto a cada campo", () => {
    cy.visit("/registro");

    cy.campo("Email, obligatorio").type("no-es-un-email");
    cy.campo("Contraseña, obligatorio").type("corta");
    cy.boton("Crear cuenta").click();

    cy.contains("Ingresá tu nombre.").should("be.visible");
    cy.contains("Ingresá tu apellido.").should("be.visible");
    cy.contains("Ingresá un email válido.").should("be.visible");
    cy.contains("Usá al menos 8 caracteres, con letras y números.").should("be.visible");
    cy.location("pathname").should("eq", "/registro");
  });

  it("los requisitos de la contraseña se tildan mientras se escribe", () => {
    cy.visit("/registro");

    cy.campo("Contraseña, obligatorio").type("abc1");

    cy.get('[aria-label="Una letra: cumplido"]').should("exist");
    cy.get('[aria-label="Al menos 8 caracteres: falta"]').should("exist");
  });
});
