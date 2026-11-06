export const CONTRASENIA = "aiticketit123";
export const USUARIOS = {
  sofia: "sofia@aiticketit.com",
  valentina: "valentina@aiticketit.com",
  lucia: "lucia@aiticketit.com",
};

const api = (ruta) => `${Cypress.expose("apiUrl")}${ruta}`;

Cypress.Commands.add("prepararDatos", () => {
  cy.request("POST", api("/dev/reset"));
  cy.request("POST", api("/dev/pasarela"), { disponible: true });
});

Cypress.Commands.add("cambiarPasarela", (disponible) => {
  cy.request("POST", api("/dev/pasarela"), { disponible });
});

// Pide la sesión a la API y deja el refresh token donde lo busca la app al abrir. Solo el test de login pasa
// por el formulario: así los demás no dependen de él.
Cypress.Commands.add("iniciarSesion", (email) => {
  cy.request("POST", api("/auth/login"), { email, password: CONTRASENIA }).then(({ body }) => {
    window.localStorage.setItem("aiticketit.refreshToken", body.refreshToken);
  });
});

// Hace una request como otra persona, sin pasar por la interfaz.
Cypress.Commands.add("pedirComo", (email, metodo, ruta, cuerpo) => {
  cy.request("POST", api("/auth/login"), { email, password: CONTRASENIA }).then(({ body }) =>
    cy.request({
      method: metodo,
      url: api(ruta),
      body: cuerpo,
      headers: { Authorization: `Bearer ${body.accessToken}` },
    }),
  );
});

// Selectores por lo que ve la persona: en React Native Web, accessibilityLabel es aria-label.
Cypress.Commands.add("boton", (nombre) => cy.get(`[role="button"][aria-label="${nombre}"]`));
Cypress.Commands.add("botonQueEmpieza", (nombre) => cy.get(`[role="button"][aria-label^="${nombre}"]`));
// Espera a que esté habilitado: en CI, Cypress llegó a encontrar el buscador deshabilitado por un instante al
// abrir la pantalla, y `type` falla sin reintentar.
Cypress.Commands.add("campo", (etiqueta) =>
  cy.get(`input[aria-label="${etiqueta}"], textarea[aria-label="${etiqueta}"]`).should("be.enabled"),
);
Cypress.Commands.add("estadoDeLaCompra", (estado) => cy.get(`[aria-label^="Estado: ${estado}"]`));
