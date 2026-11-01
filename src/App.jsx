import { useState } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import CrearDesafio from "./components/CrearDesafio";
import JugarDesafio from "./components/JugarDesafio";

// Componente para manejar la ruta del desafío del Jugador 2
function DesafioWrapper() {
  let { id } = useParams();
  return <JugarDesafio desafioId={id} />;
}

// Menú Principal con opciones claras para Desafío y Duelo
function MenuPrincipal() {
  const [categoria, setCategoria] = useState("Cultura General");
  const [modoActivo, setModoActivo] = useState(null); // 'menu', 'desafio', 'duelo'
  const [nombreDuelo, setNombreDuelo] = useState("");
  const [salaDuelo, setSalaDuelo] = useState("");

  const crearDueloEnVivo = (e) => {
    e.preventDefault();
    if (!nombreDuelo.trim()) return alert("Ingresa tu nombre");
    // Código de sala corregido sin error de sintaxis numérica
    const codigoSala = Math.random().toString(36).substring(2, 8).toUpperCase();
    const urlDuelo = `${window.location.origin}/duelo/${codigoSala}?jugador=${encodeURIComponent(nombreDuelo)}`;
    setSalaDuelo(urlDuelo);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-6 text-center">
      <h1 className="text-3xl font-bold text-indigo-600">Trivia Mundial</h1>
      
      {modoActivo === null && (
        <div className="space-y-4">
          <p className="text-gray-600">Selecciona cómo deseas competir contra otra persona:</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Categoría:</label>
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
            onClick={() => setModoActivo("desafio")}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow"
          >
            ⚔️ Modo Desafío (14 Preguntas / Asíncrono)
          </button>

          <button
            onClick={() => setModoActivo("duelo")}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition shadow"
          >
            🎮 Modo Duelo 1vs1 (Sala Compartida)
          </button>
        </div>
      )}

      {modoActivo === "desafio" && (
        <div className="space-y-4">
          <CrearDesafio categoriaSeleccionada={categoria} />
          <button
            onClick={() => setModoActivo(null)}
            className="text-sm text-gray-500 underline hover:text-gray-700 block mx-auto"
          >
            ← Volver al menú principal
          </button>
        </div>
      )}

      {modoActivo === "duelo" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-green-600">Modo Duelo 1vs1</h2>
          {!salaDuelo ? (
            <form onSubmit={crearDueloEnVivo} className="space-y-3 text-left">
              <label className="block text-sm font-medium text-gray-700">Tu Nombre:</label>
              <input
                type="text"
                placeholder="Ej. Carlos"
                value={nombreDuelo}
                onChange={(e) => setNombreDuelo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
              <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
                Crear Enlace de Duelo
              </button>
            </form>
          ) : (
            <div className="space-y-3 bg-gray-50 p-4 rounded text-left">
              <p className="text-sm text-green-700 font-semibold text-center">¡Sala de Duelo creada!</p>
              <p className="text-xs text-gray-500">Comparte este enlace con tu oponente para que ingrese desde su celular:</p>
              <input type="text" readOnly value={salaDuelo} className="w-full p-2 text-xs bg-white border rounded" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(salaDuelo);
                  alert("¡Enlace de duelo copiado!");
                }}
                className="w-full bg-indigo-600 text-white p-2 rounded text-sm"
              >
                Copiar Enlace
              </button>
            </div>
          )}
          <button
            onClick={() => { setModoActivo(null); setSalaDuelo(""); }}
            className="text-sm text-gray-500 underline hover:text-gray-700 block mx-auto"
          >
            ← Volver al menú principal
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