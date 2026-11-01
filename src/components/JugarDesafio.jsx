import React, { useEffect, useState } from "react";
import { obtenerDesafio, enviarIntentoDesafio } from "../services/desafioService";

export default function JugarDesafio({ desafioId }) {
  const [desafio, setDesafio] = useState(null);
  const [nombreJugador, setNombreJugador] = useState("");
  const [iniciado, setIniciado] = useState(false);
  const [indiceActual, setIndiceActual] = useState(0);
  const [puntaje, setPuntaje] = useState(0);
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [tiempoTotal, setTiempoTotal] = useState(0);
  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerDesafio(desafioId)
      .then((data) => {
        setDesafio(data);
        setLoading(false);
      })
      .catch((err) => {
        alert("El desafío no existe o expiró.");
        setLoading(false);
      });
  }, [desafioId]);

  const comenzarJuego = (e) => {
    e.preventDefault();
    if (!nombreJugador.trim()) return alert("Ingresa tu nombre para jugar");
    setIniciado(true);
    setTiempoInicio(Date.now());
  };

  const handleResponder = (opcionElegida) => {
    const preguntaActual = desafio.preguntas[indiceActual];
    const esCorrecta = opcionElegida === preguntaActual.respuesta_correcta;

    let nuevoPuntaje = puntaje;
    if (esCorrecta) {
      nuevoPuntaje += 1;
      setPuntaje(nuevoPuntaje);
    }

    const siguienteIndice = indiceActual + 1;
    if (siguienteIndice < desafio.preguntas.length) {
      setIndiceActual(siguienteIndice);
    } else {
      // Fin del juego (las 14 preguntas terminadas)
      const tiempoFin = (Date.now() - tiempoInicio) / 1000; // en segundos
      setTiempoTotal(tiempoFin);
      
      // Enviar resultado al backend
      enviarIntentoDesafio(desafioId, nombreJugador, nuevoPuntaje, tiempoFin)
        .then((res) => {
          setResultadoFinal(res);
        })
        .catch((err) => alert("Error al guardar el resultado"));
    }
  };

  if (loading) return <div className="text-center p-10">Cargando desafío...</div>;
  if (!desafio) return <div className="text-center p-10 text-red-500">Desafío no encontrado.</div>;

  // Pantalla de resultados finales
  if (resultadoFinal) {
    return (
      <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md text-center space-y-4">
        <h2 className="text-3xl font-bold text-indigo-600">¡Desafío Finalizado!</h2>
        <p className="text-lg">Ganador: <span className="font-bold text-green-600">{resultadoFinal.ganador ? `🏆 ${resultadoFinal.ganador}` : "Empate"}</span></p>
        
        <div className="bg-gray-50 p-4 rounded-md space-y-2 text-left">
          <p><b>{resultadoFinal.jugador1.nombre}:</b> {resultadoFinal.jugador1.puntaje}/14 aciertos ({resultadoFinal.jugador1.tiempo?.toFixed(1)}s)</p>
          {resultadoFinal.jugador2 && (
            <p><b>{resultadoFinal.jugador2.nombre}:</b> {resultadoFinal.jugador2.puntaje}/14 aciertos ({resultadoFinal.jugador2.tiempo?.toFixed(1)}s)</p>
          )}
        </div>
        <a href="/" className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Volver al Inicio</a>
      </div>
    );
  }

  // Pantalla previa para ingresar nombre antes de empezar
  if (!iniciado) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
        <h2 className="text-2xl font-bold text-center">Te han retado a un Desafío</h2>
        <p className="text-center text-gray-600">Categoría: <b>{desafio.categoria}</b></p>
        <p className="text-center text-sm text-gray-500">Retador: <b>{desafio.jugador1_nombre}</b></p>
        
        {desafio.jugador1_puntaje !== 0 && (
          <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 text-center">
            Puntaje a vencer: <b>{desafio.jugador1_puntaje}/14 aciertos</b>
          </div>
        )}

        <form onSubmit={comenzarJuego} className="space-y-4">
          <input
            type="text"
            placeholder="Tu Nombre"
            value={nombreJugador}
            onChange={(e) => setNombreJugador(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
            ¡Comenzar Desafío (14 Preguntas)!
          </button>
        </form>
      </div>
    );
  }

  // Pantalla de preguntas en curso
  const preguntaActual = desafio.preguntas[indiceActual];

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-4">
      <div className="flex justify-between text-sm text-gray-500 font-semibold">
        <span>Pregunta {indiceActual + 1} / 14</span>
        <span>Aciertos: {puntaje}</span>
      </div>

      <h3 className="text-xl font-bold text-gray-800">{preguntaActual.pregunta}</h3>

      <div className="space-y-2">
        {preguntaActual.opciones.map((opcion, idx) => (
          <button
            key={idx}
            onClick={() => handleResponder(opcion)}
            className="w-full text-left p-3 bg-gray-100 hover:bg-indigo-50 border border-gray-200 rounded-lg transition font-medium"
          >
            {opcion}
          </button>
        ))}
      </div>
    </div>
  );
}