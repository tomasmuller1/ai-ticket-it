import { USUARIOS } from "../support/commands";

// Un error tarda en verse porque React Query reintenta antes (hasta 2 veces, con backoff).
const TRAS_LOS_REINTENTOS = { timeout: 20_000 };
const ID_INEXISTENTE = "00000000-0000-4000-8000-000000000000";

describe("Pantallas de error", () => {
  beforeEach(() => {
    cy.iniciarSesion(USUARIOS.sofia);
  });

  it("con un 500 muestra el problema interno y Reintentar carga los datos", () => {
    let caido = true;
    cy.intercept("GET", "**/api/eventos/e-rock-nacional", (req) => {
      if (caido) {
        req.reply({
          statusCode: 500,
          body: { error: { codigo: "ERROR_INTERNO", mensaje: "Error interno del servidor" } },
        });
      } else {
        req.continue();
      }
    });
    cy.visit("/evento/e-rock-nacional");

    cy.contains("Tuvimos un problema interno", TRAS_LOS_REINTENTOS).should("be.visible");
    cy.contains("Error interno del servidor").should("not.exist");

    cy.then(() => {
      caido = false;
    });
    cy.boton("Reintentar").click();

    cy.contains("Noche de Rock Nacional").should("be.visible");
  });

  it("sin red muestra que no pudo conectarse y ofrece Reintentar", () => {
    cy.intercept("GET", "**/api/eventos/e-rock-nacional", { forceNetworkError: true });
    cy.visit("/evento/e-rock-nacional");

    cy.contains("No pudimos conectarnos", TRAS_LOS_REINTENTOS).should("be.visible");
    cy.boton("Reintentar").should("be.visible");
  });

  it("un evento inexistente muestra solo el mensaje, sin Reintentar ni el id, y se puede volver", () => {
    cy.visit(`/evento/${ID_INEXISTENTE}`);

    cy.contains("Este evento ya no existe").should("be.visible");
    cy.boton("Reintentar").should("not.exist");
    cy.contains(ID_INEXISTENTE).should("not.exist");

    cy.boton("Volver").click();

    cy.location("pathname").should("eq", "/");
  });

  it("una compra de otra persona avisa que no hay acceso, sin Reintentar", () => {
    cy.visit("/compra/c-05");

    cy.contains("No tenés acceso a esta compra").should("be.visible");
    cy.boton("Reintentar").should("not.exist");
  });

  it("una ruta inexistente muestra la pantalla en español", () => {
    cy.visit("/esto/no/existe");

    cy.contains("Esta pantalla no existe").should("be.visible");
    cy.boton("Ir al inicio").click();

    cy.location("pathname").should("eq", "/");
  });
});

describe("Sesión vencida", () => {
  it("si el refresh token ya no sirve, el login lo explica", () => {
    window.localStorage.setItem("aiticketit.refreshToken", "token-revocado");

    cy.visit("/");

    cy.contains("Tu sesión venció. Ingresá de nuevo para seguir.").should("be.visible");
  });
});
