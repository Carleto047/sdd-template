import React, { useState } from "react";
import CrearDesafio from "./components/CrearDesafio";
import JugarDesafio from "./components/JugarDesafio";

export default function App() {
  // Estado para controlar qué pestaña está activa ("1", "1vs1", "desafio")
  const [vistaActiva, setVistaActiva] = useState("1vs1");
  const [salaCreada, setSalaCreada] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: "#3b82f6", padding: "20px", fontFamily: "sans-serif" }}>
      {/* Barra de Navegación Superior */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px" }}>
        <button 
          onClick={() => setVistaActiva("1")}
          style={{ padding: "10px 20px", background: vistaActiva === "1" ? "#1e40af" : "#fff", color: vistaActiva === "1" ? "#fff" : "#000", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}
        >
          👤 1 Jugador
        </button>
        <button 
          onClick={() => setVistaActiva("1vs1")}
          style={{ padding: "10px 20px", background: vistaActiva === "1vs1" ? "#1e40af" : "#fff", color: vistaActiva === "1vs1" ? "#fff" : "#000", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}
        >
          ⚔️ 1 vs 1 (Por turnos)
        </button>
        <button 
          onClick={() => setVistaActiva("desafio")}
          style={{ padding: "10px 20px", background: vistaActiva === "desafio" ? "#1e40af" : "#fff", color: vistaActiva === "desafio" ? "#fff" : "#000", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }}
        >
          🎯 Modo Desafío (Simultáneo)
        </button>
      </div>

      {/* Contenido según la pestaña seleccionada */}
      <div style={{ maxWidth: "800px", margin: "auto" }}>
        {vistaActiva === "1" && (
          <div style={{ background: "#fff", padding: "20px", borderRadius: "10px", textAlign: "center" }}>
            <h2>Modo 1 Jugador (Local)</h2>
            <p>Aquí puedes mantener tu ruleta y juego clásico individual.</p>
          </div>
        )}

        {vistaActiva === "1vs1" && (
          <div>
            <div style={{ background: "#eff6ff", padding: "15px", borderRadius: "10px", marginBottom: "20px", textAlign: "center" }}>
              <h3>Modo 1 vs 1 entre Celulares (Por Turnos)</h3>
              <p>Crea una sala con tu nombre o unete a una existente mediante código o enlace.</p>
            </div>
            
            {/* Componente para crear sala o unirse */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <CrearDesafio onPartidaCreada={(sala) => setSalaCreada(sala)} />
              <hr style={{ border: "0", borderTop: "1px solid #ccc" }} />
              <JugarDesafio />
            </div>
          </div>
        )}

        {vistaActiva === "desafio" && (
          <div>
            <div style={{ background: "#eff6ff", padding: "15px", borderRadius: "10px", marginBottom: "20px", textAlign: "center" }}>
              <h3>Modo Desafío (Mismas Preguntas, Tiempo y Reporte)</h3>
              <p>Compite simultáneamente respondiendo las mismas preguntas. ¡Gana el de mayor acierto y menor tiempo!</p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <CrearDesafio onPartidaCreada={(sala) => setSalaCreada(sala)} />
              <hr style={{ border: "0", borderTop: "1px solid #ccc" }} />
              <JugarDesafio />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}