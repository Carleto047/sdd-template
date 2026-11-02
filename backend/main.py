import json
import os
import random
import time

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from pydantic import BaseModel

from database import SessionLocal, engine, Base
from models import QuestionModel
from desafio import router as desafio_router, Base as DesafioBase, migrar_columnas_multijugador

# La generación de preguntas con IA es opcional: si falta la librería o la clave,
# el servidor arranca igual y el juego sigue funcionando con las preguntas existentes.
try:
    from ia_generator import generar_10_preguntas_nuevas
except Exception as e:  # noqa: BLE001
    generar_10_preguntas_nuevas = None
    print(f"IA desactivada: {e}")

# 1. Crear las tablas principales y las del sistema de desafíos
Base.metadata.create_all(bind=engine)
DesafioBase.metadata.create_all(bind=engine)

# Aplicar la migración de columnas multijugador para el 1v1 y el modo desafío
migrar_columnas_multijugador()


# 2. Asegurar que la columna 'usada' exista en la tabla preguntas.
#    Funciona en SQLite (tu PC) y en PostgreSQL (Render).
def asegurar_columna_usada():
    try:
        columnas = [c["name"] for c in inspect(engine).get_columns("preguntas")]
        if "usada" not in columnas:
            with engine.begin() as conexion:
                conexion.execute(text("ALTER TABLE preguntas ADD COLUMN usada BOOLEAN DEFAULT FALSE"))
    except Exception as e:  # noqa: BLE001
        print(f"No se pudo asegurar la columna 'usada': {e}")


asegurar_columna_usada()

# Si models.py no define la columna 'usada', el juego funciona igual (solo no se registra el uso)
TIENE_USADA = hasattr(QuestionModel, "usada")
if not TIENE_USADA:
    print("AVISO: QuestionModel no tiene la columna 'usada' (revisá models.py). Se omite el registro de uso.")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluimos el router de desafíos
app.include_router(desafio_router)

# Tiempo en segundos según la dificultad de la pregunta
TIEMPOS_POR_DIFICULTAD = {"facil": 15, "normal": 30, "dificil": 40}

# Porcentaje de preguntas usadas de una categoría a partir del cual se generan 10 nuevas con IA
PORCENTAJE_USO_PARA_GENERAR = 75
# Si la IA falla, no se vuelve a intentar en esa categoría durante este tiempo (segundos)
ESPERA_ENTRE_INTENTOS_IA = 600
_ultimo_intento_ia: dict = {}

ARCHIVO_SEMILLA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preguntas_semilla.json")


def nueva_pregunta_modelo(**datos):
    """Crea una pregunta; agrega 'usada' solo si el modelo la tiene."""
    if TIENE_USADA:
        datos["usada"] = False
    return QuestionModel(**datos)


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
            db.add(nueva_pregunta_modelo(
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
    except Exception as e:  # noqa: BLE001
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


def intentar_generar_con_ia(db: Session, categoria: str) -> bool:
    """Genera 10 preguntas nuevas con IA. Si algo falla, el juego sigue con las que ya hay."""
    if generar_10_preguntas_nuevas is None:
        return False
    ahora = time.time()
    if ahora - _ultimo_intento_ia.get(categoria, 0) < ESPERA_ENTRE_INTENTOS_IA:
        return False
    _ultimo_intento_ia[categoria] = ahora
    try:
        print(f"La categoría '{categoria}' alcanzó el uso máximo. Generando 10 preguntas nuevas con IA...")
        nuevas_preguntas_data = generar_10_preguntas_nuevas(categoria)
        agregadas = 0
        for q_data in nuevas_preguntas_data:
            opciones = q_data.get("opciones")
            correcta = q_data.get("respuesta_correcta")
            if not q_data.get("pregunta") or not isinstance(opciones, list) or correcta not in opciones:
                continue  # se descarta cualquier pregunta mal formada
            db.add(nueva_pregunta_modelo(
                categoria=q_data.get("categoria", categoria),
                pregunta=q_data.get("pregunta"),
                opciones=opciones,
                respuesta_correcta=correcta,
                dificultad=q_data.get("dificultad", "normal"),
                veces_correcta=0,
                veces_incorrecta=0,
            ))
            agregadas += 1
        db.commit()
        return agregadas > 0
    except Exception as e:  # noqa: BLE001
        db.rollback()
        print(f"No se pudieron generar preguntas con IA: {e}")
        return False


@app.get("/api/v1/question/random/{categoria}")
def get_random_question(categoria: str, db: Session = Depends(get_db)):
    """
    Obtiene una pregunta aleatoria de la categoría.
    Si se alcanzó el porcentaje de uso configurado, intenta generar 10 preguntas nuevas con IA
    (si falla, el juego sigue normalmente) y marca las elegidas como usadas para evitar repeticiones.
    """
    preguntas_categoria = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()
    total_preguntas = len(preguntas_categoria)

    if total_preguntas == 0:
        raise HTTPException(status_code=404, detail=f"No hay preguntas para la categoría: {categoria}")

    # 1. Porcentaje de uso actual de la categoría
    preguntas_usadas = [p for p in preguntas_categoria if getattr(p, "usada", False)]
    porcentaje_uso = (len(preguntas_usadas) / total_preguntas) * 100

    # 2. Si se alcanza o supera el límite, se intenta generar preguntas nuevas con IA
    if porcentaje_uso >= PORCENTAJE_USO_PARA_GENERAR:
        if intentar_generar_con_ia(db, categoria):
            preguntas_categoria = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()

    # 3. Solo las que no fueron marcadas como usadas
    preguntas_disponibles = [p for p in preguntas_categoria if not getattr(p, "usada", False)]

    # Si ya se usaron todas, se reinicia el estado 'usada'
    if not preguntas_disponibles:
        if TIENE_USADA:
            for p in preguntas_categoria:
                p.usada = False
            db.commit()
        preguntas_disponibles = preguntas_categoria

    # 4. Elegir una al azar
    pregunta_elegida = random.choice(preguntas_disponibles)

    # 5. Marcarla como usada para evitar repeticiones en las siguientes rondas
    if TIENE_USADA:
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
        "tiempo_limite": TIEMPOS_POR_DIFICULTAD.get(pregunta.dificultad, 30),
    }


# ==========================================================
# CONFIGURACIÓN PARA SERVIR EL FRONTEND DE REACT EN RENDER
# ==========================================================

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
if not os.path.exists(frontend_dist):
    frontend_dist = os.path.join(os.path.dirname(__file__), "dist")

if os.path.exists(frontend_dist):
    assets_path = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("health"):
            raise HTTPException(status_code=404, detail="API route not found")

        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)

        return FileResponse(os.path.join(frontend_dist, "index.html"))