import random
import string
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Boolean, JSON
from database import Base, SessionLocal
from models import QuestionModel

router = APIRouter(prefix="/api/v1/desafios", tags=["Desafios"])

# ==========================================
# MODELO DE BASE DE DATOS PARA DUELOS 1V1
# ==========================================
class DueloModel(Base):
    __tablename__ = "duelos_1v1"

    id = Column(Integer, primary_key=True, index=True)
    codigo_sala = Column(String, unique=True, index=True)
    categoria = Column(String)
    preguntas_ids = Column(JSON) # IDs de las preguntas compartidas para el duelo
    
    # Jugador 1 (Creador)
    jugador_1 = Column(String)
    puntaje_1 = Column(Integer, default=0)
    progreso_1 = Column(Integer, default=0) # Índice de la pregunta actual (0 a 4)
    terminado_1 = Column(Boolean, default=False)
    
    # Jugador 2 (Oponente)
    jugador_2 = Column(String, nullable=True)
    puntaje_2 = Column(Integer, default=0)
    progreso_2 = Column(Integer, default=0)
    terminado_2 = Column(Boolean, default=False)
    
    estado = Column(String, default="esperando") # 'esperando', 'jugando', 'finalizado'

# ==========================================
# ESQUEMAS PYDANTIC
# ==========================================
class CrearDueloInput(BaseModel):
    nombre_jugador: str
    categoria: str

class UnirseDueloInput(BaseModel):
    codigo_sala: str
    nombre_jugador: str

class ResponderDueloInput(BaseModel):
    jugador_id: int # 1 o 2
    es_correcta: bool

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generar_codigo():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# ==========================================
# ENDPOINTS DE LA API PARA 1V1
# ==========================================

@router.post("/crear")
def crear_duelo(data: CrearDueloInput, db: Session = Depends(get_db)):
    """El Jugador 1 crea la sala ingresando su nombre y la categoría."""
    preguntas = db.query(QuestionModel).filter(QuestionModel.categoria == data.categoria).all()
    if len(preguntas) < 5:
        raise HTTPException(status_code=400, detail="No hay suficientes preguntas en esta categoría para armar un duelo de 5 rondas.")
    
    # Seleccionamos exactamente 5 preguntas aleatorias para ambos jugadores
    preguntas_seleccionadas = random.sample(preguntas, 5)
    ids = [p.id for p in preguntas_seleccionadas]
    
    codigo = generar_codigo()
    
    nuevo_duelo = DueloModel(
        codigo_sala=codigo,
        categoria=data.categoria,
        preguntas_ids=ids,
        jugador_1=data.nombre_jugador.strip(),
        puntaje_1=0,
        progreso_1=0,
        estado="esperando"
    )
    
    db.add(nuevo_duelo)
    db.commit()
    db.refresh(nuevo_duelo)
    
    # Retornamos el código y un enlace directo listo para compartir
    return {
        "codigo_sala": nuevo_duelo.codigo_sala,
        "jugador_id": 1,
        "enlace_invitacion": f"https://sdd-template.onrender.com/jugar-duelo?sala={nuevo_duelo.codigo_sala}",
        "mensaje": "Sala creada con éxito."
    }

@router.post("/unirse")
def unirse_duelo(data: UnirseDueloInput, db: Session = Depends(get_db)):
    """El Jugador 2 se une desde otro dispositivo usando el código de sala y su nombre."""
    duelo = db.query(DueloModel).filter(DueloModel.codigo_sala == data.codigo_sala.strip().upper()).first()
    if not duelo:
        raise HTTPException(status_code=404, detail="Sala no encontrada. Verifica el código.")
    
    if duelo.estado != "esperando":
        raise HTTPException(status_code=400, detail="El duelo ya comenzó o la sala está cerrada.")
    
    if duelo.jugador_1.lower() == data.nombre_jugador.strip().lower():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso por el creador.")

    duelo.jugador_2 = data.nombre_jugador.strip()
    duelo.estado = "jugando"
    db.commit()
    db.refresh(duelo)
    
    return {
        "codigo_sala": duelo.codigo_sala,
        "jugador_id": 2,
        "categoria": duelo.categoria,
        "mensaje": "Te has unido al duelo con éxito."
    }

@router.get("/estado/{codigo_sala}")
def obtener_estado_duelo(codigo_sala: str, db: Session = Depends(get_db)):
    """Permite a ambos celulares consultar en tiempo real los puntajes y las preguntas."""
    duelo = db.query(DueloModel).filter(DueloModel.codigo_sala == codigo_sala.upper()).first()
    if not duelo:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    
    # Cargamos las preguntas correspondientes a la sala
    preguntas_objs = []
    for q_id in duelo.preguntas_ids:
        p = db.query(QuestionModel).filter(QuestionModel.id == q_id).first()
        if p:
            preguntas_objs.append({
                "id": p.id,
                "pregunta": p.pregunta,
                "opciones": p.opciones,
                "respuesta_correcta": p.respuesta_correcta,
                "dificultad": p.dificultad
            })

    return {
        "estado": duelo.estado,
        "jugador_1": duelo.jugador_1,
        "puntaje_1": duelo.puntaje_1,
        "progreso_1": duelo.progreso_1,
        "terminado_1": duelo.terminado_1,
        "jugador_2": duelo.jugador_2 or "Esperando oponente...",
        "puntaje_2": duelo.puntaje_2,
        "progreso_2": duelo.progreso_2,
        "terminado_2": duelo.terminado_2,
        "preguntas": preguntas_objs
    }

@router.post("/responder/{codigo_sala}")
def registrar_respuesta_duelo(codigo_sala: str, data: ResponderDueloInput, db: Session = Depends(get_db)):
    """Registra si el jugador 1 o 2 respondió bien o mal, sumando puntos y avanzando su progreso."""
    duelo = db.query(DueloModel).filter(DueloModel.codigo_sala == codigo_sala.upper()).first()
    if not duelo:
        raise HTTPException(status_code=404, detail="Sala no encontrada.")
    
    total_preguntas = len(duelo.preguntas_ids)
    
    if data.jugador_id == 1:
        if data.es_correcta:
            duelo.puntaje_1 += 10
        duelo.progreso_1 += 1
        if duelo.progreso_1 >= total_preguntas:
            duelo.terminado_1 = True
    elif data.jugador_id == 2:
        if data.es_correcta:
            duelo.puntaje_2 += 10
        duelo.progreso_2 += 1
        if duelo.progreso_2 >= total_preguntas:
            duelo.terminado_2 = True

    # Si ambos terminaron sus 5 preguntas, el duelo finaliza oficialmente
    if duelo.terminado_1 and duelo.terminado_2:
        duelo.estado = "finalizado"

    db.commit()
    db.refresh(duelo)
    
    return {
        "mensaje": "Respuesta procesada",
        "progreso_1": duelo.progreso_1,
        "progreso_2": duelo.progreso_2,
        "estado": duelo.estado
    }