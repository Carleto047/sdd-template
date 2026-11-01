import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import CrearDesafio from "./components/CrearDesafio";
import JugarDesafio from "./components/JugarDesafio";

// Componente auxiliar para extraer el ID de la URL
function DesafioWrapper() {
  let { id } = useParams();
  return <JugarDesafio desafioId={id} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <Routes>
          {/* Ruta principal de tu app (puedes mantener tu contenido actual aquí) */}
          <Route path="/" element={
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-indigo-600">Trivia de Entretenimiento Mundial</h1>
              <p className="text-gray-600">Bienvenido al juego. Selecciona un modo para comenzar.</p>
              {/* Aquí puedes poner un botón que lleve a <CrearDesafio /> */}
              <div className="mt-4">
                <CrearDesafio categoriaSeleccionada="Cultura General" />
              </div>
            </div>
          } />

          {/* Ruta dinámica para que el Jugador 2 abra el enlace del Desafío */}
          <Route path="/desafio/:id" element={<DesafioWrapper />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}