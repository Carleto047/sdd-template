"""
Guarda TODAS las preguntas de la base de datos en el archivo ../public/preguntas.json
para que el juego pueda funcionar aunque el servidor esté dormido o sin conexión.

Se ejecuta desde la carpeta backend, con el entorno virtual activado:
    python exportar_preguntas.py
"""
import json
import os
from collections import Counter
from datetime import datetime, timezone

from database import SessionLocal
from models import QuestionModel

DESTINO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "preguntas.json")


def main():
    db = SessionLocal()
    try:
        filas = db.query(QuestionModel).order_by(QuestionModel.id).all()
        preguntas = [
            {
                "id": q.id,
                "categoria": q.categoria,
                "pregunta": q.pregunta,
                "opciones": list(q.opciones),
                "respuesta_correcta": q.respuesta_correcta,
                "dificultad": q.dificultad or "normal",
            }
            for q in filas
        ]
    finally:
        db.close()

    if not preguntas:
        print("La base de datos no tiene preguntas. No se creó ningún archivo.")
        return

    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    with open(DESTINO, "w", encoding="utf-8") as archivo:
        json.dump(
            {"generado": datetime.now(timezone.utc).isoformat(), "preguntas": preguntas},
            archivo,
            ensure_ascii=False,
        )

    print(f"Listo: {len(preguntas)} preguntas guardadas en {os.path.normpath(DESTINO)}")
    for categoria, cantidad in sorted(Counter(p["categoria"] for p in preguntas).items()):
        print(f"  {categoria}: {cantidad}")


if __name__ == "__main__":
    main()