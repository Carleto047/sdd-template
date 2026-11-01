import { useState } from "react";
import { BrowserRouter, Routes, Route, useParams, Link } from "react-router-dom";
import CrearDesafio from "./components/CrearDesafio";
import JugarDesafio from "./components/JugarDesafio";

// Componente para manejar la ruta del desafío del Jugador 2
function DesafioWrapper() {
  let { id } = useParams();
  return <JugarDesafio desafioId={id} />;
}

// Menú Principal de la Aplicación
function MenuPrincipal() {
  const [categoria, setCategoria] = useState("Cultura General");
  const [modoCrear, setModoCrear] = useState(false);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-6 text-center">
      <h1 className="text-3xl font-bold text-indigo-600">Trivia Mundial</h1>
      <p className="text-gray-600">Elige una categoría y reta a un amigo compartiendo el enlace en su celular.</p>

      {!modoCrear ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona Categoría:</label>
            <select 
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="Cultura General">Cultura General</option>
              <option value="Historia">Historia</option>
              <option value="Ciencia">Ciencia</option>
              <option value="Geografía">Geografía</option>
            </select>
          </div>

          <button
            onClick={() => setModoCrear(true)}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow"
          >
            ⚔️ Crear Desafío 1vs1 (Enviar Enlace)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <CrearDesafio categoriaSeleccionada={categoria} />
          <button
            onClick={() => setModoCrear(false)}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            ← Volver al menú
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <Routes>
          <Route path="/" element={<MenuPrincipal />} />
          <Route path="/desafio/:id" element={<DesafioWrapper />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}