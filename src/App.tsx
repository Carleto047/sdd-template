import "./App.css";
import Ruleta from "./Ruleta";

function App() {
  return (
    <div className="app-container">
      <h1>Juego de Preguntados</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Girá la ruleta para obtener una pregunta al azar de la categoría correspondiente.
      </p>
      
      {/* Renderizamos el componente de la ruleta que creamos anteriormente */}
      <Ruleta />
    </div>
  );
}

export default App;
