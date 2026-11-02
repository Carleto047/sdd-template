import React, { useState } from "react";
import { crearPartidaApi } from "../services/desafioService";

export default function CrearDesafio({ onPartidaCreada }) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Geografía");
  const [tipoModo, setTipoModo] = useState("1v1");
  const [datosSala, setDatosSala] = useState(null);
  const [error, setError] = useState("");

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa tu nombre.");
      return;
    }
    try {
      setError("");
      const resultado = await crearPartidaApi(nombre, categoria, tipoModo);
      setDatosSala(resultado);
      if (onPartidaCreada) onPartidaCreada(resultado);
    } catch (err) {
      setError("No se pudo crear la sala. Intenta nuevamente.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
      <h2>Crear Partida Multijugador</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!datosSala ? (
        <form onSubmit={handleCrear} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <label>Tu Nombre:</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Ej: Carlos"
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            />
          </div>

          <div>
            <label>Categoría:</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
              <option value="Geografía">Geografía</option>
              <option value="Ciencia">Ciencia</option>
              <option value="Historia">Historia</option>
              <option value="Arte">Arte</option>
              <option value="Deportes">Deportes</option>
              <option value="Entretenimiento">Entretenimiento</option>
            </select>
          </div>

          <div>
            <label>Modo de Juego:</label>
            <select value={tipoModo} onChange={(e) => setTipoModo(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "5px" }}>
              <option value="1v1">Modo 1v1 (Por turnos - Si fallas, cedes el turno)</option>
              <option value="desafio">Modo Desafío (Simultáneo - Mismas preguntas, gana por aciertos y menor tiempo con reporte)</option>
            </select>
          </div>

          <button type="submit" style={{ padding: "10px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Generar Sala y Enlace
          </button>
        </form>
      ) : (
        <div style={{ textAlign: "center", background: "#f3f4f6", padding: "15px", borderRadius: "8px" }}>
          <h3>¡Sala Creada con Éxito!</h3>
          <p>Comparte este código o enlace con tu oponente en su celular:</p>
          <h2 style={{ color: "#2563eb", letterSpacing: "2px" }}>{datosSala.codigo_sala}</h2>
          
          <div style={{ margin: "15px 0" }}>
            <input 
              type="text" 
              readOnly 
              value={datosSala.enlace_invitacion} 
              style={{ width: "100%", padding: "8px", textAlign: "center", fontSize: "12px" }}
            />
          </div>

          <button 
            onClick={() => navigator.clipboard.writeText(datosSala.enlace_invitacion)}
            style={{ padding: "8px 15px", background: "#10b981", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            Copiar Enlace de Invitación
          </button>
        </div>
      )}
    </div>
  );
}