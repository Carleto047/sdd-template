import json
import os
import random

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, engine, Base
from models import QuestionModel
from desafio import router as desafio_router

Base.metadata.create_all(bind=engine)

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
    Si una categoría no tiene preguntas en la base (por ejemplo, la base nueva de Render),
    las carga desde preguntas_semilla.json. Si la categoría ya tiene preguntas, no toca nada.
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
    preguntas = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()
    if not preguntas:
        raise HTTPException(status_code=404, detail=f"No hay preguntas para la categoría: {categoria}")
    return a_respuesta(random.choice(preguntas))

@app.post("/api/v1/question/{id}/responder")
def registrar_respuesta(id: int, respuesta: RespuestaInput, db: Session = Depends(get_db)):
    """
    Se llama cada vez que un jugador responde una pregunta.
    Actualiza el contador de aciertos/errores y, al llegar a 5 respuestas registradas para esa pregunta, la reclasifica como fácil, difícil o normal.
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