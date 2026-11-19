import { CONTRASENIA, USUARIOS } from "../support/commands";

// La barra tiene estas pestañas, en orden (el lector oye "Notificaciones" en la de Avisos). La aserción
// reintenta hasta que la barra termina de montarse.
const verPestanias = (esperadas) =>
  cy.get('[role="tab"]').should(($pestanias) => {
    const nombres = [...$pestanias].map((pestania) => pestania.getAttribute("aria-label").split(",")[0]);
    expect(nombres).to.deep.equal(esperadas);
  });

function completarRegistro({ tipo, email = "nadia@mail.com", confirmacion = "miClave123" }) {
  cy.get(`[role="radio"][aria-label="${tipo}"]`).click();
  cy.campo("Nombre, obligatorio").type("Nadia");
  cy.campo("Apellido, obligatorio").type("Ruiz");
  cy.campo("Email, obligatorio").type(email);
  cy.campo("Contraseña, obligatorio").type("miClave123");
  cy.campo("Repetí la contraseña, obligatorio").type(confirmacion);
}

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

    cy.contains("Elegí si vas a comprar entradas u organizar eventos.").should("be.visible");
    cy.contains("Ingresá tu nombre.").should("be.visible");
    cy.contains("Ingresá tu apellido.").should("be.visible");
    cy.contains("Ingresá un email válido.").should("be.visible");
    cy.contains("Usá al menos 8 caracteres, con letras y números.").should("be.visible");
    cy.location("pathname").should("eq", "/registro");
  });

  it("no deja registrarse si las contraseñas no coinciden", () => {
    cy.visit("/registro");

    completarRegistro({ tipo: "Quiero comprar entradas", confirmacion: "otraClave123" });
    cy.boton("Crear cuenta").click();

    cy.contains("Las contraseñas no coinciden.").should("be.visible");
    cy.location("pathname").should("eq", "/registro");
  });

  it("una cuenta de comprador ve Explorar, Favoritos, Entradas, Avisos y Perfil", () => {
    cy.visit("/registro");

    completarRegistro({ tipo: "Quiero comprar entradas", email: "nueva.compradora@mail.com" });
    cy.boton("Crear cuenta").click();

    cy.contains("Hola, Nadia").should("be.visible");
    verPestanias(["Explorar", "Favoritos", "Entradas", "Notificaciones", "Perfil"]);
  });

  it("una cuenta de organizador ve Mis eventos y explora sin poder comprar", () => {
    cy.visit("/registro");

    completarRegistro({ tipo: "Organizo eventos", email: "nueva.organizadora@mail.com" });
    cy.boton("Crear cuenta").click();

    cy.contains("Hola, Nadia").should("be.visible");
    verPestanias(["Explorar", "Mis eventos", "Notificaciones", "Perfil"]);

    cy.botonQueEmpieza("Jazz en el Club").click();
    cy.textoEnPantalla(
      "Con tu cuenta de organizador podés ver los eventos, pero no comprar entradas.",
    ).should("be.visible");
    cy.get('[role="button"][aria-label="Comprar entradas"]').should("not.exist");
  });

  it("los requisitos de la contraseña se tildan mientras se escribe", () => {
    cy.visit("/registro");

    cy.campo("Contraseña, obligatorio").type("abc1");

    cy.get('[aria-label="Una letra: cumplido"]').should("exist");
    cy.get('[aria-label="Al menos 8 caracteres: falta"]').should("exist");
  });
});
