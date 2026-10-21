# Especificación del Proyecto: Juego de Preguntados Web

Este documento define la arquitectura, el stack tecnológico, las especificaciones de diseño y las convenciones de desarrollo para el juego de preguntas y respuestas (estilo Preguntados) basado en el repositorio `sdd-template`.

---

## 1. Stack Tecnológico

El proyecto está estructurado de manera desacoplada utilizando herramientas modernas y tipadas:

*   **Frontend:** React (v18+) inicializado con **Vite** y configurado con **TypeScript**. Ubicado en la raíz y la carpeta `src/`.
*   **Backend (API):** **FastAPI** (Python 3.10+) encargado de la lógica de negocio, validaciones y exposición de endpoints REST. Ubicado en la carpeta `backend/`.
*   **Base de Datos:** **PostgreSQL** para la persistencia de preguntas, categorías, opciones y respuestas correctas.
*   **Estilos / UI:** CSS nativo, Tailwind CSS o módulos de CSS garantizando fidelidad visual con el diseño de referencia (clásica ruleta colorida).

---

## 2. Arquitectura y Estructura del Repositorio

El repositorio sigue un patrón de monorepo simplificado:

```text
sdd-template/
├── .opencode/           # Configuración del agente y especificaciones
│   └── openspec/
│       └── project.md   # [Este archivo] Especificación técnica
├── backend/             # Directorio del servidor Python
│   ├── venv/            # Entorno virtual de Python
│   ├── main.py          # Punto de entrada de FastAPI e inicialización de Uvicorn
│   └── ...              # Modelos, esquemas y conexión a PostgreSQL
├── src/                 # Código fuente del Frontend (React + TS)
│   ├── assets/          # Imágenes, SVG (Ruleta, iconos de corona)
│   ├── components/      # Componentes UI (Ruleta, Tablero, TarjetaPregunta)
│   ├── App.tsx          # Componente principal de control de estados del juego
│   └── main.tsx         # Punto de entrada de React
├── vite.config.ts       # Configuración de Vite y Proxy de desarrollo
└── package.json         # Dependencias del Frontend y scripts de Node
```

---

## 3. Mecánica del Juego (Flujo del Usuario)

El juego está diseñado para **dos jugadores locales** (compartiendo la misma pantalla/navegador):

1.  **Pantalla de Inicio / Turno:** Se muestra el jugador activo ("Jugador 1" o "Jugador 2") junto a la ruleta clásica dividida en 6 secciones de colores (Categorías) y una sección especial de **¡Comodín!**.
2.  **Giro de Ruleta:** El usuario presiona "¡Girar Ruleta!". La ruleta gira visualmente (vía animaciones CSS/Canvas) y se detiene en una categoría aleatoria.
    *   *Caso Comodín:* Si cae en Comodín, se habilitan los 6 botones inferiores para que el jugador elija la categoría que prefiera de forma manual.
3.  **Consulta a la API:** El cliente frontend genera un número de ID aleatorio (o secuencial según la lógica de partida) y realiza la petición HTTP a la API de FastAPI.
4.  **Pantalla de Pregunta:** Se renderiza la pregunta obtenida con sus 4 opciones en forma de botones.
5.  **Validación y Puntaje:** El jugador selecciona una opción:
    *   Si es correcta, suma un punto (o una corona de esa categoría) y mantiene el turno.
    *   Si es incorrecta, el turno cambia al otro jugador.

---

## 4. Integración Frontend y API (Contrato de Datos)

### Configuración del Proxy de Desarrollo
Para evitar problemas de Cross-Origin Resource Sharing (CORS) y resolver conflictos de puertos durante el desarrollo local, `vite.config.ts` utiliza un proxy inverso que mapea las consultas del puerto `5173` al puerto `8000`:

*   **Ruta Frontend:** `http://localhost:5173/api/v1/...`
*   **Destino Real (Backend):** `http://localhost:8000/api/v1/...`

### Consumo del Endpoint
El Frontend consume las preguntas realizando peticiones HTTP utilizando la Fetch API nativa de JavaScript o Axios:

*   **Método:** `GET`
*   **URL:** `http://localhost:8000/api/v1/question/<id>`

### Formato de Respuesta de la API (JSON)
La base de datos PostgreSQL proveerá la información a través de FastAPI respetando estrictamente el siguiente esquema de datos tipado en TypeScript:

```json
{
  "id": 1,
  "categoria": "Geografía",
  "pregunta": "¿Cuál es la capital de Francia?",
  "opciones": [
    "Madrid",
    "París",
    "Roma",
    "Berlín"
  ],
  "respuesta_correcta": "París"
}
```

### Interfaz de TypeScript Correspondiente (`src/types/game.ts`)
```typescript
export interface Question {
  id: number;
  categoria: 'Geografía' | 'Arte' | 'Ciencia' | 'Matemáticas' | 'Historia' | 'Deportes';
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
}
```

---

## 5. Diseño Visual y UI de Referencia

La interfaz debe cumplir de manera estricta con las pautas estéticas de la imagen de muestra:

*   **Contenedor Principal:** Tarjeta central con bordes redondeados (`border-radius`), sombras suaves (`box-shadow`), y un fondo degradado sutil.
*   **La Ruleta:** Un círculo dividido simétricamente en sectores usando los colores característicos del juego original:
    *   🔴 Rojo (Historia)
    *   🟡 Amarillo (Ciencia)
    *   🟢 Verde (Deportes)
    *   🔵 Azul / Celeste (Geografía)
    *   🟠 Naranja (Arte)
    *   🟣 Morado / Violeta (Matemáticas)
*   **Botones de Acción:** Botones de categorías planos con bordes ligeramente redondeados, utilizando una paleta de colores pastel/azul desaturado para el estado de selección inactivo.
*   **Tipografía:** Limpia, sans-serif, con variaciones de peso (`font-weight: bold`) para resaltar el jugador actual y los eventos importantes ("¡Comodín!").

---

## 6. Convenciones de Desarrollo

1.  **Control de Estados:** El estado de los puntajes de ambos jugadores, las categorías obtenidas y el turno actual deben ser manejados mediante un estado centralizado en `App.tsx` (o un Context Provider si el proyecto escala).
2.  **Manejo de Errores HTTP:** Si la API devuelve un error o se cae la conexión, el frontend debe renderizar un estado de contingencia elegante (un componente de alerta con un botón de reintento controlado) para evitar pantallas en blanco.
3.  **Tipado Estricto:** Está prohibido el uso del tipo `any` en TypeScript. Todas las propiedades de los componentes de la ruleta y las tarjetas de preguntas deben estar debidamente interfaces/types definidos.

