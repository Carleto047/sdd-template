import random
import string
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, JSON, Float
from database import Base, SessionLocal
from models import QuestionModel

router = APIRouter(prefix="/api/v1/desafios", tags=["Desafios"])

# ==========================================
# MODELO DE BASE DE DATOS UNIFICADO CON REGLAS DISTINTAS
# ==========================================
class PartidaMultijugadorModel(Base):
    __tablename__ = "partidas_multijugador"

    id = Column(Integer, primary_key=True, index=True)
    codigo_sala = Column(String, unique=True, index=True)
    tipo_modo = Column(String)  # "1v1" (por turnos) o "desafio" (simultáneo con tiempo y reporte)
    categoria = Column(String)
    preguntas_ids = Column(JSON)  # IDs de preguntas (idénticas para ambos en modo desafío)
    
    estado = Column(String, default="esperando")  # "esperando", "jugando", "finalizado"
    
    # Jugador 1
    jugador_1 = Column(String)
    puntaje_1 = Column(Integer, default=0)
    progreso_1 = Column(Integer, default=0)  # Pregunta actual / índice
    tiempo_total_1 = Column(Float, default=0.0)  # Suma de tiempos en segundos (clave para desempate en Desafío)
    terminado_1 = Column(Boolean, default=False)
    
    # Jugador 2
    jugador_2 = Column(String, nullable=True)
    puntaje_2 = Column(Integer, default=0)
    progreso_2 = Column(Integer, default=0)
    tiempo_total_2 = Column(Float, default=0.0)
    terminado_2 = Column(Boolean, default=False)
    
    # Específico para Modo 1v1 (Control de turnos)
    turno_actual = Column(Integer, default=1)  # 1 o 2 (indica a qué jugador le toca responder)


# ==========================================
# ESQUEMAS PYDANTIC
# ==========================================
class CrearPartidaInput(BaseModel):
    nombre_jugador: str
    categoria: str
    tipo_modo: str  # "1v1" o "desafio"

class UnirsePartidaInput(BaseModel):
    codigo_sala: str
    nombre_jugador: str

class ResponderInput(BaseModel):
    jugador_id: int  # 1 o 2
    es_correcta: bool
    tiempo_empleado: float = 0.0  # Segundos que tardó en responder (vital para el modo desafío)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generar_codigo():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


# ==========================================
# ENDPOINTS DE LA API
# ==========================================

@router.post("/crear")
def crear_partida(data: CrearPartidaInput, db: Session = Depends(get_db)):
    """Crea una sala de juego diferenciando si es Modo 1v1 (turnos) o Modo Desafío (simultáneo)."""
    if data.tipo_modo not in ["1v1", "desafio"]:
        raise HTTPException(status_code=400, detail="Modo de juego inválido. Debe ser '1v1' o 'desafio'.")

    preguntas = db.query(QuestionModel).filter(QuestionModel.categoria == data.categoria).all()
    if len(preguntas) < 5:
        raise HTTPException(status_code=400, detail="No hay suficientes preguntas en esta categoría (mínimo 5 requeridas).")
    
    # Seleccionamos 5 preguntas
    preguntas_seleccionadas = random.sample(preguntas, 5)
    ids = [p.id for p in preguntas_seleccionadas]
    codigo = generar_codigo()
    
    nueva_partida = PartidaMultijugadorModel(
        codigo_sala=codigo,
        tipo_modo=data.tipo_modo,
        categoria=data.categoria,
        preguntas_ids=ids,
        jugador_1=data.nombre_jugador.strip(),
        estado="esperando",
        turno_actual=1
    )
    
    db.add(nueva_partida)
    db.commit()
    db.refresh(nueva_partida)
    
    return {
        "codigo_sala": nueva_partida.codigo_sala,
        "jugador_id": 1,
        "tipo_modo": nueva_partida.tipo_modo,
        "enlace_invitacion": f"https://sdd-template.onrender.com/jugar?sala={nueva_partida.codigo_sala}",
        "mensaje": f"Sala creada para el modo {data.tipo_modo.upper()} con éxito."
    }


@router.post("/unirse")
def unirse_partida(data: UnirsePartidaInput, db: Session = Depends(get_db)):
    """Permite al segundo jugador unirse desde otro celular usando el código y su nombre."""
    partida = db.query(PartidaMultijugadorModel).filter(PartidaMultijugadorModel.codigo_sala == data.codigo_sala.strip().upper()).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Sala no encontrada. Verifica el código.")
    
    if partida.estado != "esperando":
        raise HTTPException(status_code=400, detail="La partida ya comenzó o la sala está cerrada.")
    
    if partida.jugador_1.lower() == data.nombre_jugador.strip().lower():
        raise HTTPException(status_code=400, detail="Ese nombre ya está en uso en esta sala.")

    partida.jugador_2 = data.nombre_jugador.strip()
    partida.estado = "jugando"
    db.commit()
    db.refresh(partida)
    
    return {
        "codigo_sala": partida.codigo_sala,
        "jugador_id": 2,
        "tipo_modo": partida.tipo_modo,
        "categoria": partida.categoria,
        "mensaje": "Te has unido a la partida correctamente."
    }


@router.get("/estado/{codigo_sala}")
def obtener_estado_partida(codigo_sala: str, db: Session = Depends(get_db)):
    """Consulta en tiempo real el estado, puntajes, turnos y preguntas para ambos celulares."""
    partida = db.query(PartidaMultijugadorModel).filter(PartidaMultijugadorModel.codigo_sala == codigo_sala.upper()).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    
    preguntas_objs = []
    for q_id in partida.preguntas_ids:
        p = db.query(QuestionModel).filter(QuestionModel.id == q_id).first()
        if p:
            preguntas_objs.append({
                "id": p.id,
                "pregunta": p.pregunta,
                "opciones": p.opciones,
                "respuesta_correcta": p.respuesta_correcta,
                "dificultad": p.dificultad
            })

    # Si la partida ha finalizado, preparamos el reporte detallado con estadísticas, ganador y desempate por tiempo
    reporte = None
    if partida.estado == "finalizado":
        ganador = "Empate"
        if partida.puntaje_1 > partida.puntaje_2:
            ganador = partida.jugador_1
        elif partida.puntaje_2 > partida.puntaje_1:
            ganador = partida.jugador_2
        else:
            # Desempate por menor tiempo total acumulado (Modo Desafío)
            if partida.tiempo_total_1 < partida.tiempo_total_2:
                ganador = f"{partida.jugador_1} (por menor tiempo)"
            elif partida.tiempo_total_2 < partida.tiempo_total_1:
                ganador = f"{partida.jugador_2} (por menor tiempo)"

        reporte = {
            "ganador": ganador,
            "detalles": {
                partida.jugador_1: {
                    "puntaje": partida.puntaje_1,
                    "tiempo_total_segundos": round(partida.tiempo_total_1, 2)
                },
                partida.jugador_2: {
                    "puntaje": partida.puntaje_2,
                    "tiempo_total_segundos": round(partida.tiempo_total_2, 2)
                }
            }
        }

    return {
        "tipo_modo": partida.tipo_modo,
        "estado": partida.estado,
        "turno_actual": partida.turno_actual,  # Útil para el modo 1v1 por turnos
        "jugador_1": partida.jugador_1,
        "puntaje_1": partida.puntaje_1,
        "progreso_1": partida.progreso_1,
        "terminado_1": partida.terminado_1,
        "jugador_2": partida.jugador_2 or "Esperando oponente...",
        "puntaje_2": partida.puntaje_2,
        "progreso_2": partida.progreso_2,
        "terminado_2": partida.terminado_2,
        "preguntas": preguntas_objs,
        "reporte": reporte
    }


@router.post("/responder/{codigo_sala}")
def registrar_respuesta(codigo_sala: str, data: ResponderInput, db: Session = Depends(get_db)):
    """Procesa la respuesta aplicando las reglas específicas del Modo 1v1 (turnos) o Modo Desafío (simultáneo con tiempos)."""
    partida = db.query(PartidaMultijugadorModel).filter(PartidaMultijugadorModel.codigo_sala == codigo_sala.upper()).first()
    if not partida:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    
    total_preguntas = len(partida.preguntas_ids)

    # REGLA 1: MODO 1V1 (POR TURNOS)
    if partida.tipo_modo == "1v1":
        if data.jugador_id != partida.turno_actual:
            raise HTTPException(status_code=400, detail="No es tu turno de responder.")
        
        if data.es_correcta:
            if data.jugador_id == 1:
                partida.puntaje_1 += 10
            else:
                partida.puntaje_2 += 10
            # Si acierta, mantiene su turno para la siguiente pregunta o avanza.
        else:
            # Si responde mal, el turno pasa automáticamente al otro jugador
            partida.turno_actual = 2 if partida.turno_actual == 1 else 1

        # Avanzar progreso del jugador que respondió
        if data.jugador_id == 1:
            partida.progreso_1 += 1
            if partida.progreso_1 >= total_preguntas:
                partida.terminado_1 = True
        else:
            partida.progreso_2 += 1
            if partida.progreso_2 >= total_preguntas:
                partida.terminado_2 = True

    # REGLA 2: MODO DESAFÍO (SIMULTÁNEO, MISMAS PREGUNTAS, ACUMULA TIEMPO)
    elif partida.tipo_modo == "desafio":
        if data.jugador_id == 1:
            if data.es_correcta:
                partida.puntaje_1 += 10
            partida.tiempo_total_1 += data.tiempo_empleado
            partida.progreso_1 += 1
            if partida.progreso_1 >= total_preguntas:
                partida.terminado_1 = True
        elif data.jugador_id == 2:
            if data.es_correcta:
                partida.puntaje_2 += 10
            partida.tiempo_total_2 += data.tiempo_empleado
            partida.progreso_2 += 1
            if partida.progreso_2 >= total_preguntas:
                partida.terminado_2 = True

    # Verificar si ambos terminaron para cerrar la partida y activar el reporte
    if partida.terminado_1 and partida.terminado_2:
        partida.estado = "finalizado"

    db.commit()
    db.refresh(partida)
    
    return {
        "mensaje": "Respuesta procesada correctamente",
        "estado": partida.estado,
        "turno_actual": partida.turno_actual,
        "progreso_1": partida.progreso_1,
        "progreso_2": partida.progreso_2
    }