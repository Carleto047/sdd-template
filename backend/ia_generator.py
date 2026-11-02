import os
import json
from openai import OpenAI

# Inicialización diferida del cliente de OpenAI
_client = None

def _get_client():
    """Crea el cliente de OpenAI solo cuando se necesita (así el servidor arranca aunque no haya clave)."""
    global _client
    if _client is None:
        clave = os.environ.get("OPENAI_API_KEY")
        if not clave:
            raise RuntimeError("Falta configurar OPENAI_API_KEY para generar preguntas con IA")
        _client = OpenAI(api_key=clave)
    return _client

def generar_10_preguntas_nuevas(categoria: str):
    prompt = (
        f"Genera exactamente 10 preguntas nuevas y de gran impacto cultural para la categoría '{categoria}' de un juego tipo Trivias (Preguntados). "
        "Las preguntas deben ser muy conocidas, haber causado impacto histórico o mediático, y ser pertinentes a la categoría. "
        "Devuelve estrictamente un objeto JSON válido que contenga una clave llamada 'preguntas' con una lista de objetos. Cada objeto debe tener exactamente estas claves: "
        "'categoria' (string), 'pregunta' (string), 'opciones' (una lista exacta de 4 strings), 'respuesta_correcta' (un string que coincida exactamente con una de las opciones), "
        "y 'dificultad' (Fácil, Media o Difícil)."
    )
    
    try:
        # Llamada directa utilizando la función de inicialización diferida
        response = _get_client().chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={
                "type": "json_object"
            }
        )
        contenido = response.choices[0].message.content
        datos = json.loads(contenido)
        return datos.get("preguntas", [])
        
    except Exception as e:
        print(f"Error generando preguntas con IA: {e}")
        return []
