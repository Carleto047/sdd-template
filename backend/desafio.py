"""Salas multijugador para Preguntados.

Modos:
- 1v1: por turnos. Acierto = conserva el turno; error = lo cede.
- desafio: ambos resuelven las mismas preguntas, en el mismo orden,
  de manera independiente y simultanea.

Las respuestas se validan en el servidor. El endpoint de estado nunca
entrega la respuesta correcta.
"""

import random
import secrets
import time
import unicodedata
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Boolean, JSON, Float, inspect, text
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import QuestionModel

router = APIRouter(prefix="/api/v1/desafios", tags=["Desafios"])
TIEMPOS_POR_DIFICULTAD = {"facil": 15, "fácil": 15, "normal": 30, "dificil": 40, "difícil": 40}
PREGUNTAS_POR_SALA = 14


class PartidaMultijugadorModel(Base):
    __tablename__ = "partidas_multijugador"

    id = Column(Integer, primary_key=True, index=True)
    codigo_sala = Column(String, unique=True, index=True, nullable=False)
    tipo_modo = Column(String, nullable=False)  # "1v1" o "desafio"
    categoria = Column(String, nullable=False)
    preguntas_ids = Column(JSON, nullable=False)
    estado = Column(String, default="esperando", nullable=False)

    jugador_1 = Column(String, nullable=False)
    puntaje_1 = Column(Integer, default=0, nullable=False)
    progreso_1 = Column(Integer, default=0, nullable=False)
    tiempo_total_1 = Column(Float, default=0.0, nullable=False)
    terminado_1 = Column(Boolean, default=False, nullable=False)
    token_1 = Column(String, nullable=True)
    inicio_pregunta_1 = Column(Float, nullable=True)

    jugador_2 = Column(String, nullable=True)
    puntaje_2 = Column(Integer, default=0, nullable=False)
    progreso_2 = Column(Integer, default=0, nullable=False)
    tiempo_total_2 = Column(Float, default=0.0, nullable=False)
    terminado_2 = Column(Boolean, default=False, nullable=False)
    token_2 = Column(String, nullable=True)
    inicio_pregunta_2 = Column(Float, nullable=True)

    turno_actual = Column(Integer, default=1, nullable=False)


class CrearPartidaInput(BaseModel):
    nombre_jugador: str = Field(min_length=1, max_length=24)
    categoria: str = Field(min_length=1, max_length=60)
    tipo_modo: str


class UnirsePartidaInput(BaseModel):
    codigo_sala: str = Field(min_length=6, max_length=6)
    nombre_jugador: str = Field(min_length=1, max_length=24)


class ResponderInput(BaseModel):
    jugador_id: int = Field(ge=1, le=2)
    indice_pregunta: int = Field(ge=0)
    opcion: str = Field(max_length=500)
    tiempo_empleado: float = Field(default=0.0, ge=0.0, le=300.0)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrar_columnas_multijugador():
    """Agrega los tokens a instalaciones existentes sin borrar partidas."""
    inspector = inspect(engine)
    if "partidas_multijugador" not in inspector.get_table_names():
        return
    columnas = {columna["name"] for columna in inspector.get_columns("partidas_multijugador")}
    with engine.begin() as conexion:
        migraciones = {
            "token_1": "VARCHAR",
            "token_2": "VARCHAR",
            "inicio_pregunta_1": "DOUBLE PRECISION",
            "inicio_pregunta_2": "DOUBLE PRECISION",
        }
        for nombre, tipo in migraciones.items():
            if nombre not in columnas:
                conexion.execute(text(f"ALTER TABLE partidas_multijugador ADD COLUMN {nombre} {tipo}"))


def limpiar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def normalizar_respuesta(texto: str) -> str:
    normalizado = unicodedata.normalize("NFKC", texto or "")
    return " ".join(normalizado.casefold().strip().split())


def generar_codigo(db: Session) -> str:
    for _ in range(30):
        codigo = f"{secrets.randbelow(1_000_000):06d}"
        existe = db.query(PartidaMultijugadorModel.id).filter_by(codigo_sala=codigo).first()
        if not existe:
            return codigo
    raise HTTPException(status_code=503, detail="No se pudo generar un código. Intenta nuevamente.")


def obtener_partida(db: Session, codigo: str, bloquear: bool = False):
    consulta = db.query(PartidaMultijugadorModel).filter(
        PartidaMultijugadorModel.codigo_sala == codigo.strip()
    )
    if bloquear:
        consulta = consulta.with_for_update()
    partida = consulta.first()
    if not partida:
        raise HTTPException(status_code=404, detail="No existe una sala con ese código.")
    return partida


def validar_jugador(partida: PartidaMultijugadorModel, jugador_id: int, token: str):
    token_esperado = partida.token_1 if jugador_id == 1 else partida.token_2
    if not token or not token_esperado or not secrets.compare_digest(token, token_esperado):
        raise HTTPException(status_code=403, detail="Sesión de jugador no válida. Vuelve a entrar a la sala.")
    if jugador_id == 2 and not partida.jugador_2:
        raise HTTPException(status_code=403, detail="El segundo jugador todavía no se unió.")


def progreso_jugador(partida: PartidaMultijugadorModel, jugador_id: int) -> int:
    return partida.progreso_1 if jugador_id == 1 else partida.progreso_2


def nombre_jugador(partida: PartidaMultijugadorModel, jugador_id: int) -> str:
    return partida.jugador_1 if jugador_id == 1 else (partida.jugador_2 or "Jugador 2")


def construir_reporte(partida: PartidaMultijugadorModel):
    p1 = partida.puntaje_1
    p2 = partida.puntaje_2
    ganador = "Empate"
    motivo = "Mismo puntaje"

    if p1 > p2:
        ganador, motivo = partida.jugador_1, "Mayor puntaje"
    elif p2 > p1:
        ganador, motivo = partida.jugador_2, "Mayor puntaje"
    elif partida.tipo_modo == "desafio":
        t1, t2 = partida.tiempo_total_1, partida.tiempo_total_2
        if t1 < t2:
            ganador, motivo = partida.jugador_1, "Desempate por menor tiempo total"
        elif t2 < t1:
            ganador, motivo = partida.jugador_2, "Desempate por menor tiempo total"
        else:
            motivo = "Mismo puntaje y mismo tiempo"

    total = len(partida.preguntas_ids or [])
    return {
        "ganador": ganador,
        "motivo": motivo,
        "modo": partida.tipo_modo,
        "jugadores": [
            {
                "id": 1,
                "nombre": partida.jugador_1,
                "puntos": p1,
                "aciertos": p1 // 10,
                "respondidas": partida.progreso_1,
                "total_preguntas": total,
                "tiempo_total_segundos": round(partida.tiempo_total_1, 2),
            },
            {
                "id": 2,
                "nombre": partida.jugador_2 or "Jugador 2",
                "puntos": p2,
                "aciertos": p2 // 10,
                "respondidas": partida.progreso_2,
                "total_preguntas": total,
                "tiempo_total_segundos": round(partida.tiempo_total_2, 2),
            },
        ],
    }


@router.post("/crear")
def crear_partida(data: CrearPartidaInput, db: Session = Depends(get_db)):
    nombre = limpiar_nombre(data.nombre_jugador)
    categoria = data.categoria.strip()
    modo = data.tipo_modo.strip().lower()

    if not nombre:
        raise HTTPException(status_code=400, detail="Ingresá tu nombre.")
    if modo not in ("1v1", "desafio"):
        raise HTTPException(status_code=400, detail="El modo debe ser '1v1' o 'desafio'.")

    preguntas = db.query(QuestionModel).filter(QuestionModel.categoria == categoria).all()
    if len(preguntas) < 5:
        raise HTTPException(status_code=400, detail=f"La categoría {categoria} necesita al menos 5 preguntas.")

    # Conserva el formato de 14 preguntas del modo Desafío existente.
    # Si una categoría todavía tiene menos de 14, utiliza todas las disponibles (mínimo 5).
    seleccionadas = random.sample(preguntas, min(PREGUNTAS_POR_SALA, len(preguntas)))
    token = secrets.token_urlsafe(32)
    partida = PartidaMultijugadorModel(
        codigo_sala=generar_codigo(db),
        tipo_modo=modo,
        categoria=categoria,
        preguntas_ids=[pregunta.id for pregunta in seleccionadas],
        estado="esperando",
        jugador_1=nombre,
        token_1=token,
        turno_actual=1,
    )
    db.add(partida)
    db.commit()
    db.refresh(partida)

    return {
        "codigo_sala": partida.codigo_sala,
        "jugador_id": 1,
        "token_jugador": token,
        "tipo_modo": partida.tipo_modo,
        "categoria": partida.categoria,
        "estado": partida.estado,
        "total_preguntas": len(partida.preguntas_ids),
    }


@router.post("/unirse")
def unirse_partida(data: UnirsePartidaInput, db: Session = Depends(get_db)):
    codigo = data.codigo_sala.strip()
    nombre = limpiar_nombre(data.nombre_jugador)
    if not codigo.isdigit() or len(codigo) != 6:
        raise HTTPException(status_code=400, detail="El código debe tener exactamente 6 dígitos.")
    if not nombre:
        raise HTTPException(status_code=400, detail="Ingresá tu nombre.")

    partida = obtener_partida(db, codigo, bloquear=True)
    if partida.estado != "esperando" or partida.jugador_2:
        raise HTTPException(status_code=409, detail="La sala ya tiene dos jugadores o la partida comenzó.")
    if normalizar_respuesta(partida.jugador_1) == normalizar_respuesta(nombre):
        raise HTTPException(status_code=400, detail="Elegí un nombre diferente al del creador.")

    token = secrets.token_urlsafe(32)
    partida.jugador_2 = nombre
    partida.token_2 = token
    partida.estado = "jugando"
    db.commit()
    db.refresh(partida)

    return {
        "codigo_sala": partida.codigo_sala,
        "jugador_id": 2,
        "token_jugador": token,
        "tipo_modo": partida.tipo_modo,
        "categoria": partida.categoria,
        "estado": partida.estado,
        "total_preguntas": len(partida.preguntas_ids),
    }


@router.get("/estado/{codigo_sala}")
def obtener_estado_partida(
    codigo_sala: str,
    jugador_id: int,
    x_player_token: Optional[str] = Header(default=None, alias="X-Player-Token"),
    db: Session = Depends(get_db),
):
    if jugador_id not in (1, 2):
        raise HTTPException(status_code=400, detail="Jugador inválido.")
    partida = obtener_partida(db, codigo_sala)
    validar_jugador(partida, jugador_id, x_player_token or "")

    total = len(partida.preguntas_ids or [])
    if partida.tipo_modo == "1v1":
        indice = partida.progreso_1 + partida.progreso_2
    else:
        indice = progreso_jugador(partida, jugador_id)

    puede_responder = partida.estado == "jugando"
    if partida.tipo_modo == "1v1":
        puede_responder = puede_responder and partida.turno_actual == jugador_id and indice < total
    else:
        puede_responder = puede_responder and progreso_jugador(partida, jugador_id) < total

    pregunta_actual = None
    if partida.estado == "jugando" and indice < total and (partida.tipo_modo != "desafio" or progreso_jugador(partida, jugador_id) < total):
        pregunta = db.query(QuestionModel).filter(QuestionModel.id == partida.preguntas_ids[indice]).first()
        if pregunta:
            dificultad = (pregunta.dificultad or "normal").lower()
            tiempo_limite = TIEMPOS_POR_DIFICULTAD.get(dificultad, 30)
            if puede_responder:
                campo_inicio = "inicio_pregunta_1" if jugador_id == 1 else "inicio_pregunta_2"
                inicio = getattr(partida, campo_inicio)
                if inicio is None:
                    inicio = time.time()
                    setattr(partida, campo_inicio, inicio)
                    db.commit()
                restantes = max(0.0, tiempo_limite - (time.time() - inicio))
            else:
                restantes = float(tiempo_limite)
            pregunta_actual = {
                "id": pregunta.id,
                "indice": indice,
                "categoria": pregunta.categoria,
                "pregunta": pregunta.pregunta,
                "opciones": pregunta.opciones,
                "dificultad": pregunta.dificultad,
                "tiempo_limite": tiempo_limite,
                "segundos_restantes": round(restantes, 2),
            }

    reporte = construir_reporte(partida) if partida.estado == "finalizado" else None
    return {
        "codigo_sala": partida.codigo_sala,
        "estado": partida.estado,
        "tipo_modo": partida.tipo_modo,
        "categoria": partida.categoria,
        "jugador_id": jugador_id,
        "jugador_1": partida.jugador_1,
        "jugador_2": partida.jugador_2,
        "puntaje_1": partida.puntaje_1,
        "puntaje_2": partida.puntaje_2,
        "progreso_1": partida.progreso_1,
        "progreso_2": partida.progreso_2,
        "tiempo_total_1": round(partida.tiempo_total_1, 2),
        "tiempo_total_2": round(partida.tiempo_total_2, 2),
        "terminado_1": partida.terminado_1,
        "terminado_2": partida.terminado_2,
        "turno_actual": partida.turno_actual,
        "indice_pregunta": indice,
        "total_preguntas": total,
        "puede_responder": puede_responder,
        "pregunta_actual": pregunta_actual,
        "reporte": reporte,
    }


@router.post("/responder/{codigo_sala}")
def registrar_respuesta(
    codigo_sala: str,
    data: ResponderInput,
    x_player_token: Optional[str] = Header(default=None, alias="X-Player-Token"),
    db: Session = Depends(get_db),
):
    partida = obtener_partida(db, codigo_sala, bloquear=True)
    validar_jugador(partida, data.jugador_id, x_player_token or "")

    if partida.estado != "jugando":
        raise HTTPException(status_code=409, detail="La partida no está en curso.")

    total = len(partida.preguntas_ids or [])
    if data.jugador_id == 1:
        progreso = partida.progreso_1
        terminado = partida.terminado_1
    else:
        progreso = partida.progreso_2
        terminado = partida.terminado_2

    if terminado:
        raise HTTPException(status_code=409, detail="Ya terminaste tus preguntas.")

    if partida.tipo_modo == "1v1":
        indice_esperado = partida.progreso_1 + partida.progreso_2
        if partida.turno_actual != data.jugador_id:
            raise HTTPException(status_code=409, detail="No es tu turno. Esperá al otro jugador.")
    else:
        indice_esperado = progreso

    if data.indice_pregunta != indice_esperado or indice_esperado >= total:
        raise HTTPException(status_code=409, detail="La pregunta ya fue respondida o quedó desactualizada.")

    pregunta = db.query(QuestionModel).filter(
        QuestionModel.id == partida.preguntas_ids[indice_esperado]
    ).first()
    if not pregunta:
        raise HTTPException(status_code=500, detail="No se pudo recuperar la pregunta de la sala.")

    campo_inicio = "inicio_pregunta_1" if data.jugador_id == 1 else "inicio_pregunta_2"
    inicio = getattr(partida, campo_inicio)
    if inicio is None:
        # Si el cliente envía una respuesta sin haber consultado el estado, no se le concede tiempo extra.
        inicio = time.time()
        setattr(partida, campo_inicio, inicio)
    segundos = max(0.0, min(300.0, time.time() - inicio))
    dificultad = (pregunta.dificultad or "normal").lower()
    limite = TIEMPOS_POR_DIFICULTAD.get(dificultad, 30)
    dentro_del_tiempo = segundos <= limite
    correcta = dentro_del_tiempo and normalizar_respuesta(data.opcion) == normalizar_respuesta(pregunta.respuesta_correcta)
    setattr(partida, campo_inicio, None)

    if data.jugador_id == 1:
        if correcta:
            partida.puntaje_1 += 10
        partida.progreso_1 += 1
        partida.tiempo_total_1 += segundos
        if partida.progreso_1 >= total:
            partida.terminado_1 = True
    else:
        if correcta:
            partida.puntaje_2 += 10
        partida.progreso_2 += 1
        partida.tiempo_total_2 += segundos
        if partida.progreso_2 >= total:
            partida.terminado_2 = True

    if partida.tipo_modo == "1v1" and not correcta:
        partida.turno_actual = 2 if data.jugador_id == 1 else 1

    if partida.tipo_modo == "1v1":
        if partida.progreso_1 + partida.progreso_2 >= total:
            partida.terminado_1 = True
            partida.terminado_2 = True
            partida.estado = "finalizado"
    elif partida.terminado_1 and partida.terminado_2:
        partida.estado = "finalizado"

    db.commit()
    db.refresh(partida)

    return {
        "mensaje": "Respuesta registrada.",
        "correcta": correcta,
        "tiempo_agotado": not dentro_del_tiempo,
        "respuesta_correcta": pregunta.respuesta_correcta,
        "tiempo_empleado_servidor": round(segundos, 2),
        "puntaje_1": partida.puntaje_1,
        "puntaje_2": partida.puntaje_2,
        "estado": partida.estado,
        "turno_actual": partida.turno_actual,
        "progreso_1": partida.progreso_1,
        "progreso_2": partida.progreso_2,
    }
