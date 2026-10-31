# Mobile: AI Ticket It

@AGENTS.md

Expo SDK 58 + Expo Router, JavaScript. Corre en el celular con Expo Go y en el navegador con Expo web (para verificar la UI).

## Estructura de `src/`

- `app/`: rutas de Expo Router. Cada archivo es una pantalla y los `_layout.jsx` definen la navegación. Acá no va lógica reutilizable.
- `components/`: componentes de UI reutilizables.
- `api/client.js`: único punto de acceso al backend (URL base, headers, errores). Las pantallas nunca llaman a `fetch` directamente.
- `api/endpoints.js`: un método por endpoint. `api/almacenamiento.js`: refresh token en SecureStore (localStorage en web).
- `context/SesionContext.jsx`: sesión (`useSesion()`): login, registro, logout y restauración al abrir la app. El access token vive solo en memoria y se renueva solo ante un 401.
- Navegación: `app/_layout.jsx` protege las rutas con `Stack.Protected` (login/registro sin sesión, `(tabs)` con sesión).
- `components/ui/`: componentes base (`Texto`, `Boton`, `Campo`, `Chip`, `BadgeEstado`, `Estrellas`, `Stepper`, `Skeleton`, `EstadoVacio`, `EstadoError`). Usarlos antes de crear algo nuevo.
- Datos: TanStack Query (`useQuery` / `useMutation`) sobre `api`.
- `theme.js`: tokens de diseño (colores, tipografía, espaciados, radios). **No usar colores ni tamaños sueltos en los estilos.**

## Reglas

- Instalar paquetes **solo** con `npx expo install <paquete>`, y antes verificar que funcionen en Expo Go (sin código nativo propio).
- El proyecto es JavaScript: de `AGENTS.md` no aplica `npx tsc --noEmit`. Antes de dar algo por terminado: `npm run lint` (ESLint con `eslint-config-expo`).
- La lógica de negocio vive en el backend. La app muestra lo que devuelve la API (por ejemplo, las acciones permitidas de una compra) y no recalcula reglas.
- Textos en español rioplatense, claros y cortos.

## Checklist de cada pantalla

- [ ] Estados de carga (skeleton o spinner), vacío y error (con opción de reintentar).
- [ ] Funciona si el backend está caído o lento.
- [ ] Accesibilidad: `accessibilityLabel` en elementos táctiles sin texto, área táctil ≥ 44 pt, contraste suficiente.
- [ ] Verificada en Expo web (ancho de celular) y confirmada en Expo Go.
