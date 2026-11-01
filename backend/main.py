import json
import os
import random

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text  # 👈 Importamos text para la ejecución de SQL directo
from pydantic import BaseModel
from database import SessionLocal, engine, Base
from models import QuestionModel
from desafio import router as desafio_router
from ia_generator import generar_10_preguntas_nuevas  # 👈 Importamos el generador de IA

Base.metadata.create_all(bind=engine)

# 👇 Sentencia de seguridad para crear la columna 'usada' en PostgreSQL si aún no existe
with engine.connect() as connection:
    connection.execute(text('ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS usada BOOLEAN DEFAULT FALSE;'))
    connection.commit()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(desafio_router)

# Tiempo en segundos según la dificultad de la pregunta
TIEMPOS_POR_DIFICULTAD = {"facil": 15, "normal": 30, "dificil": 40}

ARCHIVO_SEMILLA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preguntas_semilla.json")


def sembrar_preguntas():
    """
    Si una categoría no tiene preguntas en la base, las carga desde preguntas_semilla.json.
    """
    if not os.path.exists(ARCHIVO_SEMILLA):
        return
    db = SessionLocal()
    try:
        with open(ARCHIVO_SEMILLA, "r", encoding="utf-8") as archivo:
            datos = json.load(archivo)
        lista = datos["preguntas"] if isinstance(datos, dict) else datos

        categorias_con_datos = {c for (c,) in db.query(QuestionModel.categoria).distinct().all()}
        nuevas = 0
        for p in lista:
            if p["categoria"] in categorias_con_datos:
                continue
            db.add(QuestionModel(
                categoria=p["categoria"],
                pregunta=p["pregunta"],
                opciones=p["opciones"],
                respuesta_correcta=p["respuesta_correcta"],
                dificultad=p.get("dificultad") or "normal",
                veces_correcta=0,
                veces_incorrecta=0,
                usada=False,  # 👈 Inicializamos en False
            ))
            nuevas += 1
        db.commit()
        if nuevas:
            print(f"Siembra: se cargaron {nuevas} preguntas")
    except Exception as e:
        db.rollback()
        print(f"Siembra omitida por error: {e}")
    finally:
        db.close()


sembrar_preguntas()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def a_respuesta(pregunta: QuestionModel):
    """Arma la respuesta JSON de una pregunta, agregando el tiempo límite según su dificultad."""
    return {
        "id": pregunta.id,
        "categoria": pregunta.categoria,
        "pregunta": pregunta.pregunta,
        "opciones": pregunta.opciones,
        "respuesta_correcta": pregunta.respuesta_correcta,
        "dificultad": pregunta.dificultad,
        "tiempo_limite": TIEMPOS_POR_DIFICULTAD.get(pregunta.dificultad, 30),
    }

class RespuestaInput(BaseModel):
    correcta: bool

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/v1/question/{id}")
def get_question(id: int, db: Session = Depends(get_db)):
    pregunta = db.query(QuestionModel).filter(QuestionModel.id == id).first()
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")
    return a_respuesta(pregunta)

@app.get("/api/v1/question/random/{categoria}")
def get_random_question(categoria: str, db: Session = Depends(get_db)):
    """
    Obtiene una pregunta aleatoria de la categoría.
    Evalúa si se alcanzó el 75% de uso para generar 10 preguntas nuevas mediante IA,
    evitando la repetición inmediata marcándolas como usadas.
    """
    preguntas_categoria = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()
    total_preguntas = len(preguntas_categoria)
    
    if total_preguntas == 0:
        raise HTTPException(status_code=404, detail=f"No hay preguntas para la categoría: {categoria}")

    # 1. Calcular el porcentaje de uso actual de la categoría
    preguntas_usadas = [p for p in preguntas_categoria if getattr(p, "usada", False)]
    porcentaje_uso = (len(preguntas_usadas) / total_preguntas) * 100

    # 2. Si se alcanza o supera el 75%, generamos 10 preguntas nuevas con IA y las guardamos en PostgreSQL
    if porcentaje_uso >= 75:
        print(f"La categoría '{categoria}' alcanzó el {porcentaje_uso:.1f}%. Generando 10 preguntas nuevas con IA...")
        nuevas_preguntas_data = generar_10_preguntas_nuevas(categoria)
        
        for q_data in nuevas_preguntas_data:
            nueva_p = QuestionModel(
                categoria=q_data.get("categoria", categoria),
                pregunta=q_data.get("pregunta"),
                opciones=q_data.get("opciones"),
                respuesta_correcta=q_data.get("respuesta_correcta"),
                dificultad=q_data.get("dificultad", "normal"),
                veces_correcta=0,
                veces_incorrecta=0,
                usada=False
            )
            db.add(nueva_p)
        
        db.commit()
        
        # Recargamos la lista actualizada incluyendo las nuevas preguntas de la IA
        preguntas_categoria = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()

    # 3. Filtrar únicamente las preguntas que no han sido marcadas como usadas
    preguntas_disponibles = [p for p in preguntas_categoria if not getattr(p, "usada", False)]
    
    # Si por alguna razón ya se usaron todas pero no se cumplió el 75%, reseteamos el estado 'usada'
    if not preguntas_disponibles:
        for p in preguntas_categoria:
            p.usada = False
        db.commit()
        preguntas_disponibles = preguntas_categoria

    # 4. Seleccionar una pregunta al azar de las disponibles
    pregunta_elegida = random.choice(preguntas_disponibles)
    
    # 5. Marcarla como usada para evitar repeticiones en las siguientes rondas
    pregunta_elegida.usada = True
    db.commit()
    db.refresh(pregunta_elegida)

    return a_respuesta(pregunta_elegida)

@app.post("/api/v1/question/{id}/responder")
def registrar_respuesta(id: int, respuesta: RespuestaInput, db: Session = Depends(get_db)):
    """
    Se llama cada vez que un jugador responde una pregunta.
    Actualiza el contador de aciertos/errores y reclasifica la dificultad.
    """
    pregunta = db.query(QuestionModel).filter(QuestionModel.id == id).first()
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

    if respuesta.correcta:
        pregunta.veces_correcta += 1
    else:
        pregunta.veces_incorrecta += 1

    total_respuestas = pregunta.veces_correcta + pregunta.veces_incorrecta

    if total_respuestas >= 5:
        if pregunta.veces_correcta > pregunta.veces_incorrecta:
            pregunta.dificultad = "facil"
        elif pregunta.veces_incorrecta > pregunta.veces_correcta:
            pregunta.dificultad = "dificil"
        else:
            pregunta.dificultad = "normal"

    db.commit()
    db.refresh(pregunta)

    return {
        "id": pregunta.id,
        "veces_correcta": pregunta.veces_correcta,
        "veces_incorrecta": pregunta.veces_incorrecta,
        "dificultad": pregunta.dificultad,
        "tiempo_limite": TIEMPOS_POR_DIFICULTAD[pregunta.dificultad],
    }