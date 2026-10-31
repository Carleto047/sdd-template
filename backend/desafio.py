"""
Desafío 1 vs 1 (14 preguntas, mismas para los dos jugadores).

- POST /api/v1/desafio                    -> crea un desafío y devuelve su código
- GET  /api/v1/desafio/{codigo}           -> las 14 preguntas (SIN la respuesta correcta)
- POST /api/v1/desafio/{codigo}/resultado -> el jugador envía sus respuestas
- GET  /api/v1/desafio/{codigo}/reporte   -> su reporte + el del rival (solo si ya terminó)
"""
import random
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, JSON, String
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import QuestionModel

router = APIRouter(prefix="/api/v1/desafio", tags=["desafio"])

CATEGORIAS = ["Geografía", "Ciencia", "Historia", "Arte", "Deportes", "Entretenimiento", "IESETyFP"]
PREGUNTAS_POR_CATEGORIA = 2  # 7 categorías x 2 = 14 preguntas
TIEMPOS_POR_DIFICULTAD = {"facil": 15, "normal": 30, "dificil": 40}
ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0/O/1/I para evitar confusiones


# ---------------------------------------------------------------- tablas nuevas
class DesafioModel(Base):
    __tablename__ = "desafios"

    codigo = Column(String, primary_key=True)
    preguntas = Column(JSON, nullable=False)  # [{"id": 12, "tiempo_limite": 30}, ...]
    creado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ResultadoDesafioModel(Base):
    __tablename__ = "resultados_desafio"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, index=True, nullable=False)
    jugador_id = Column(String, nullable=False)
    nombre = Column(String, nullable=False)
    aciertos = Column(Integer, nullable=False)
    tiempo_total_ms = Column(Integer, nullable=False)
    detalle = Column(JSON, nullable=False)
    terminado_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# Crea solo las 2 tablas nuevas (no toca la tabla "preguntas")
Base.metadata.create_all(
    bind=engine,
    tables=[DesafioModel.__table__, ResultadoDesafioModel.__table__],
)


# ---------------------------------------------------------------- datos de entrada
class RespuestaItem(BaseModel):
    pregunta_id: int
    opcion: Optional[str] = None  # None = no respondió (se acabó el tiempo)
    tiempo_ms: int = 0


class ResultadoInput(BaseModel):
    jugador_id: str
    nombre: str
    respuestas: List[RespuestaItem]


# ---------------------------------------------------------------- utilidades
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def limpiar_codigo(codigo: str) -> str:
    return codigo.strip().upper()


def generar_codigo(db: Session) -> str:
    for _ in range(30):
        codigo = "".join(secrets.choice(ALFABETO_CODIGO) for _ in range(6))
        if not db.query(DesafioModel).filter(DesafioModel.codigo == codigo).first():
            return codigo
    raise HTTPException(status_code=500, detail="No se pudo generar un código nuevo")


def buscar_desafio(db: Session, codigo: str) -> DesafioModel:
    desafio = db.query(DesafioModel).filter(DesafioModel.codigo == limpiar_codigo(codigo)).first()
    if not desafio:
        raise HTTPException(status_code=404, detail="Código de desafío inexistente")
    return desafio


def cargar_pares(db: Session, desafio: DesafioModel):
    """Devuelve [(item_guardado, pregunta_de_la_base)] en el orden del desafío."""
    ids = [item["id"] for item in desafio.preguntas]
    filas = {q.id: q for q in db.query(QuestionModel).filter(QuestionModel.id.in_(ids)).all()}
    return [(item, filas[item["id"]]) for item in desafio.preguntas if item["id"] in filas]


def opciones_en_orden_fijo(codigo: str, pregunta) -> List[str]:
    """Mezcla las opciones, pero igual para los dos jugadores (depende del código y de la pregunta)."""
    opciones = list(pregunta.opciones)
    random.Random(f"{codigo}-{pregunta.id}").shuffle(opciones)
    return opciones


def evaluar_respuestas(pares, respuestas_por_id):
    """
    Corrige en el servidor. Una pregunta sin responder (o con una opción inválida)
    cuenta como incorrecta y suma el tiempo límite completo.
    """
    detalle = []
    aciertos = 0
    tiempo_total_ms = 0
    for item, pregunta in pares:
        enviada = respuestas_por_id[pregunta.id]
        limite_ms = int(item["tiempo_limite"]) * 1000
        opcion = enviada.opcion if (enviada.opcion is not None and enviada.opcion in pregunta.opciones) else None
        tiempo_ms = limite_ms if opcion is None else max(0, min(int(enviada.tiempo_ms), limite_ms))
        correcta = opcion == pregunta.respuesta_correcta
        if correcta:
            aciertos += 1
        tiempo_total_ms += tiempo_ms
        detalle.append({
            "pregunta_id": pregunta.id,
            "categoria": pregunta.categoria,
            "pregunta": pregunta.pregunta,
            "opcion_elegida": opcion,
            "respuesta_correcta": pregunta.respuesta_correcta,
            "correcta": correcta,
            "tiempo_ms": tiempo_ms,
        })
    return aciertos, tiempo_total_ms, detalle


def decidir_ganador(yo, rival):
    """Más aciertos gana; si empatan, gana el que tardó menos. Devuelve (ganador, criterio)."""
    if yo.aciertos != rival.aciertos:
        return ("yo" if yo.aciertos > rival.aciertos else "rival"), "más aciertos"
    if yo.tiempo_total_ms != rival.tiempo_total_ms:
        return ("yo" if yo.tiempo_total_ms < rival.tiempo_total_ms else "rival"), "mismos aciertos: gana el más rápido"
    return "empate", "mismos aciertos y mismo tiempo"


def serializar_resultado(r):
    return {
        "nombre": r.nombre,
        "aciertos": r.aciertos,
        "total": len(r.detalle),
        "tiempo_total_ms": r.tiempo_total_ms,
        "tiempo_total_seg": round(r.tiempo_total_ms / 1000, 1),
        "detalle": r.detalle,
    }


# ---------------------------------------------------------------- endpoints
@router.post("")
def crear_desafio(db: Session = Depends(get_db)):
    elegidas = []
    for categoria in CATEGORIAS:
        candidatas = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()
        if len(candidatas) < PREGUNTAS_POR_CATEGORIA:
            raise HTTPException(
                status_code=400,
                detail=f"La categoría {categoria} necesita al menos {PREGUNTAS_POR_CATEGORIA} preguntas",
            )
        elegidas.extend(random.sample(candidatas, PREGUNTAS_POR_CATEGORIA))
    random.shuffle(elegidas)

    codigo = generar_codigo(db)
    db.add(DesafioModel(
        codigo=codigo,
        preguntas=[
            {"id": q.id, "tiempo_limite": TIEMPOS_POR_DIFICULTAD.get(q.dificultad, 30)}
            for q in elegidas
        ],
    ))
    db.commit()
    return {"codigo": codigo, "total": len(elegidas)}


@router.get("/{codigo}")
def obtener_desafio(codigo: str, db: Session = Depends(get_db)):
    desafio = buscar_desafio(db, codigo)
    pares = cargar_pares(db, desafio)
    cantidad_terminados = (
        db.query(ResultadoDesafioModel).filter(ResultadoDesafioModel.codigo == desafio.codigo).count()
    )
    return {
        "codigo": desafio.codigo,
        "total": len(pares),
        "terminados": cantidad_terminados,
        "preguntas": [
            {
                "id": q.id,
                "categoria": q.categoria,
                "pregunta": q.pregunta,
                "opciones": opciones_en_orden_fijo(desafio.codigo, q),
                "tiempo_limite": item["tiempo_limite"],
                # OJO: no se envía la respuesta correcta
            }
            for item, q in pares
        ],
    }


@router.post("/{codigo}/resultado")
def guardar_resultado(codigo: str, entrada: ResultadoInput, db: Session = Depends(get_db)):
    desafio = buscar_desafio(db, codigo)
    existentes = db.query(ResultadoDesafioModel).filter(ResultadoDesafioModel.codigo == desafio.codigo).all()

    if any(r.jugador_id == entrada.jugador_id for r in existentes):
        raise HTTPException(status_code=409, detail="Ya enviaste tu resultado de este desafío")
    if len(existentes) >= 2:
        raise HTTPException(status_code=409, detail="Este desafío ya tiene dos jugadores")

    pares = cargar_pares(db, desafio)
    esperadas = sorted(q.id for _, q in pares)
    recibidas = sorted(r.pregunta_id for r in entrada.respuestas)
    if esperadas != recibidas:
        raise HTTPException(status_code=400, detail="Las respuestas no coinciden con las preguntas del desafío")

    aciertos, tiempo_total_ms, detalle = evaluar_respuestas(
        pares, {r.pregunta_id: r for r in entrada.respuestas}
    )
    nombre = entrada.nombre.strip()[:30] or "Jugador"
    db.add(ResultadoDesafioModel(
        codigo=desafio.codigo,
        jugador_id=entrada.jugador_id,
        nombre=nombre,
        aciertos=aciertos,
        tiempo_total_ms=tiempo_total_ms,
        detalle=detalle,
    ))
    db.commit()
    return {"codigo": desafio.codigo, "aciertos": aciertos, "total": len(detalle), "tiempo_total_ms": tiempo_total_ms}


@router.get("/{codigo}/reporte")
def obtener_reporte(codigo: str, jugador_id: str, db: Session = Depends(get_db)):
    desafio = buscar_desafio(db, codigo)
    resultados = db.query(ResultadoDesafioModel).filter(ResultadoDesafioModel.codigo == desafio.codigo).all()

    yo = next((r for r in resultados if r.jugador_id == jugador_id), None)
    if yo is None:
        raise HTTPException(status_code=403, detail="Primero tenés que terminar tu participación")
    rival = next((r for r in resultados if r.jugador_id != jugador_id), None)

    ganador, criterio = (None, None)
    if rival is not None:
        ganador, criterio = decidir_ganador(yo, rival)

    return {
        "codigo": desafio.codigo,
        "estado": "finalizado" if rival is not None else "esperando_rival",
        "yo": serializar_resultado(yo),
        "rival": serializar_resultado(rival) if rival is not None else None,
        "ganador": ganador,
        "criterio": criterio,
    }