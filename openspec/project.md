# Declaración del proyecto

## Qué es este sistema

Juego web de preguntas estilo Preguntados para dos personas que juegan por turnos desde el mismo
navegador. Conserva el diseño clásico: la ruleta, sus colores, sus sectores y el puntero. El
frontend obtiene cada pregunta desde una API FastAPI y nunca accede directamente a PostgreSQL.

La primera versión se ejecuta en localhost. No incluye cuentas, multijugador remoto, persistencia
de partidas ni protección contra trampas.

Lo que no debe fallar: cada pregunta mostrada debe coincidir con la respuesta que la API declara
correcta, y un error de la API nunca debe borrar el turno ni la puntuación.

## Runtime y lenguaje

| Concepto | Decisión |
|---|---|
| Lenguaje y versión | TypeScript en modo estricto; React 19 |
| Runtime de compilación | Node.js LTS |
| Versiones fijadas por | `.nvmrc` y `package-lock.json` |
| Un comando para compilar | `npm run build` |
| Un comando para probar | `npm test` |
| Un comando para lint y formato | `npm run lint` |
| Un comando para verificar tipos | `npm run typecheck` |
| Cobertura mínima | 70% de líneas sobre `src/features` |

## Frameworks y librerías

- **Frontend**: React, Vite y TypeScript. La ruleta se dibuja con SVG y se anima con CSS.
- **Estilos**: CSS Modules y variables CSS. Los colores de la ruleta se declaran en un único tema.
- **Estado**: React Context y `useReducer` para la partida (jugadores, puntuación, turno y
  pregunta actual).
- **Pruebas**: Vitest y React Testing Library. Las pruebas no llaman a la API real.
- **API**: FastAPI es un servicio existente fuera de este repositorio. Es dueño de la validación y
  del acceso a PostgreSQL.

## Almacenes de datos

| Almacén | Contenido | Migraciones |
|---|---|---|
| Memoria del navegador | Jugadores, puntuación, turno y pregunta mostrada | Ninguna; se reinicia al recargar |
| PostgreSQL | Preguntas | Proyecto FastAPI, fuera de este repositorio |

El navegador nunca recibe credenciales de PostgreSQL.

## Identidad y secretos

- No hay usuarios ni autenticación en la primera versión: el navegador es un cliente anónimo.
- Este proyecto no necesita secretos. `VITE_API_BASE_URL` solo contiene la URL base de la API
  (en desarrollo, `http://localhost:8000`) y queda visible en el paquete del navegador.
- `.env.local` no se versiona. `.env.example` documenta las variables.
- Nunca se guardan tokens, contraseñas ni credenciales en variables `VITE_*`.

## Límites de servicios

| Servicio | Responsabilidad | Protocolo |
|---|---|---|
| Aplicación React | Interfaz, ruleta, turnos, puntuación y cliente de preguntas | HTTP y JSON hacia FastAPI |
| API FastAPI | Validación y consulta de preguntas | Adaptador de datos hacia PostgreSQL |
| PostgreSQL | Persistencia de preguntas | — |

## Contrato de la API de preguntas

- **Método y ruta**: `GET /api/v1/question/{id}`
- **URL base**: `VITE_API_BASE_URL`
- **Identificador**: entero en la ruta
- **Selección de pregunta**: el frontend elige un id al azar dentro del rango configurado.
- **CORS**: FastAPI debe permitir el origen del frontend (`http://localhost:5173` en desarrollo).

Respuesta esperada:

```json
{
  "id": 42,
  "pregunta": "¿Cuál es el planeta conocido como planeta rojo?",
  "opciones": ["Venus", "Marte", "Júpiter", "Saturno"],
  "respuesta_correcta": "Marte"
}
```

Reglas del contrato:

- `id` es un número.
- `pregunta` es texto no vacío.
- `opciones` es una lista de textos no vacíos.
- `respuesta_correcta` es el texto exacto de una de las opciones.
- El cliente valida estos campos en tiempo de ejecución.
- Un error HTTP, una respuesta inválida o una API no disponible se muestran como un estado
  recuperable con botón de reintento. El reintento no borra el turno ni la puntuación.
- Los componentes no conocen la URL ni construyen la ruta de la API.

Límite de seguridad: `respuesta_correcta` llega al navegador. Es aceptable para el juego local,
pero no resiste trampas. Una versión pública debe evaluar la respuesta dentro de FastAPI.

## Despliegue

- **Ahora**: equipo de desarrollo local. Vite en `http://localhost:5173`, FastAPI en
  `http://localhost:8000`. Prueba del build con `npm run preview`.
- **Después (fuera de alcance por ahora)**: frontend como sitio estático y API con PostgreSQL en un
  servicio alojado, con HTTPS y CORS ajustado al dominio publicado.
- **Rollback**: volver al último commit estable.

## Observabilidad

Los errores de la API se escriben en la consola del navegador con `event`, `questionId`, `method`,
`path` y `status`. No se registra `respuesta_correcta`.

## Convenciones

- TypeScript con `strict: true`; no se permite `any` sin justificación.
- Componentes en PascalCase; funciones, variables y módulos en camelCase; estilos en kebab-case.
- Estructura: `src/app`, `src/features/game`, `src/features/questions`, `src/components`,
  `src/styles`.
- Las transiciones de la partida son funciones puras y se prueban sin montar componentes.
- Los componentes no hacen solicitudes HTTP; usan hooks o la capa de API.
- La animación respeta `prefers-reduced-motion`. El resultado del giro se anuncia también en una
  región viva para lectores de pantalla.
- Los controles son botones accesibles y se pueden usar con teclado.
- Los textos visibles están en español.
- Los comentarios explican razones, no historial.

## Excepciones registradas

Ninguna.
