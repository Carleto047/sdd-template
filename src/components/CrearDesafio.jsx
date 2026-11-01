import React, { useState } from "react";
import { crearDesafio } from "../services/desafioService";

export default function CrearDesafio({ categoriaSeleccionada }) {
  const [nombre, setNombre] = useState("");
  const [enlaceGenerado, setEnlaceGenerado] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return alert("Por favor ingresa tu nombre");
    
    setLoading(true);
    try {
      const data = await crearDesafio(nombre, categoriaSeleccionada || "Cultura General");
      // Construye el enlace completo basado en tu aplicación web actual
      const urlCompleta = `${window.location.origin}/desafio/${data.desafio_id}?jugador1=${encodeURIComponent(nombre)}`;
      setEnlaceGenerado(urlCompleta);
    } catch (error) {
      alert("Hubo un error al armar el desafío. Asegúrate de que haya al menos 14 preguntas en la categoría.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-2xl font-bold text-center text-indigo-600">Crear Desafío 1vs1</h2>
      <p className="text-gray-600 text-center">Categoría: <b>{categoriaSeleccionada || "Cultura General"}</b></p>
      
      {!enlaceGenerado ? (
        <form onSubmit={handleCrear} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tu Nombre (Jugador 1):</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="Ej. Carlos"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition"
          >
            {loading ? "Generando 14 preguntas fijas..." : "Generar Enlace de Desafío"}
          </button>
        </form>
      ) : (
        <div className="space-y-3 bg-gray-50 p-4 rounded-md">
          <p className="text-green-600 font-semibold text-center">¡Desafío creado con éxito!</p>
          <p className="text-xs text-gray-500">Comparte este enlace con tu amigo para que juegue las mismas 14 preguntas:</p>
          <input
            type="text"
            readOnly
            value={enlaceGenerado}
            className="w-full p-2 text-sm bg-white border border-gray-300 rounded"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(enlaceGenerado);
              alert("¡Enlace copiado al portapapeles!");
            }}
            className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700 transition"
          >
            Copiar Enlace
          </button>
        </div>
      )}
    </div>
  );
}