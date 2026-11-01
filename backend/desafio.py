import uuid
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, String, Integer, JSON, Float
from sqlalchemy.orm import Session
from database import Base, SessionLocal
from models import QuestionModel
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/desafio", tags=["Desafio"])

# 1. Modelo SQLAlchemy para la tabla de desafíos
class DesafioModel(Base):
    __tablename__ = "desafios"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    categoria = Column(String, nullable=False)
    preguntas_ids = Column(JSON, nullable=False)  # Lista con los IDs exactos de las 14 preguntas
    jugador1_nombre = Column(String, nullable=False)
    jugador1_puntaje = Column(Integer, default=0)
    jugador1_tiempo = Column(Float, default=0.0)  # Tiempo total en segundos
    jugador2_nombre = Column(String, nullable=True)
    jugador2_puntaje = Column(Integer, default=None)
    jugador2_tiempo = Column(Float, default=None)
    estado = Column(String, default="pendiente") # 'pendiente' o 'finalizado'

# Esquemas Pydantic corregidos (usando tipos nativos de Python: int)
class CrearDesafioInput(BaseModel):
    nombre_jugador: str
    categoria: str

class RegistrarIntentoInput(BaseModel):
    nombre_jugador: str
    puntaje_total: int
    tiempo_total: float

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 2. Endpoint para que el Jugador 1 cree el desafío (Selecciona 14 preguntas al azar)
@router.post("/crear")
def crear_desafio(data: CrearDesafioInput, db: Session = Depends(get_db)):
    preguntas_cat = db.query(QuestionModel).filter(QuestionModel.categoria == data.categoria).all()
    
    if len(preguntas_cat) < 14:
        raise HTTPException(
            status_code=400, 
            detail=f"No hay suficientes preguntas en la categoría '{data.categoria}' para armar un desafío de 14 preguntas (hay {len(preguntas_cat)})."
        )
    
    # Seleccionar exactamente 14 preguntas al azar
    seleccionadas = random.sample(preguntas_cat, 14)
    ids_preguntas = [p.id for p in seleccionadas]
    
    nuevo_desafio = DesafioModel(
        categoria=data.categoria,
        preguntas_ids=ids_preguntas,
        jugador1_nombre=data.nombre_jugador,
        estado="pendiente"
    )
    
    db.add(nuevo_desafio)
    db.commit()
    db.refresh(nuevo_desafio)
    
    return {
        "desafio_id": nuevo_desafio.id,
        "mensaje": "Desafío creado con éxito",
        "enlace": f"/desafio/{nuevo_desafio.id}"
    }

# 3. Endpoint para obtener los datos del desafío y las 14 preguntas exactas (con su respuesta para validar)
@router.get("/{desafio_id}")
def obtener_desafio(desafio_id: str, db: Session = Depends(get_db)):
    desafio = db.query(DesafioModel).filter(DesafioModel.id == desafio_id).first()
    if not desafio:
        raise HTTPException(status_code=404, detail="Desafío no encontrado")
    
    # Buscar las 14 preguntas usando los IDs guardados en el orden exacto
    preguntas = []
    for q_id in desafio.preguntas_ids:
        p = db.query(QuestionModel).filter(QuestionModel.id == q_id).first()
        if p:
            preguntas.append({
                "id": p.id,
                "pregunta": p.pregunta,
                "opciones": p.opciones,
                "respuesta_correcta": p.respuesta_correcta,  # 👈 Añadido para que el frontend valide
                "dificultad": p.dificultad
            })
            
    return {
        "id": desafio.id,
        "categoria": desafio.categoria,
        "jugador1_nombre": desafio.jugador1_nombre,
        "jugador1_puntaje": desafio.jugador1_puntaje,
        "jugador1_tiempo": desafio.jugador1_tiempo,
        "jugador2_nombre": desafio.jugador2_nombre,
        "jugador2_puntaje": desafio.jugador2_puntaje,
        "estado": desafio.estado,
        "preguntas": preguntas
    }

# 4. Endpoint para registrar el puntaje del Jugador 1 o Jugador 2 de forma segura
@router.post("/{desafio_id}/jugar")
def registrar_puntaje_desafio(desafio_id: str, data: RegistrarIntentoInput, db: Session = Depends(get_db)):
    desafio = db.query(DesafioModel).filter(DesafioModel.id == desafio_id).first()
    if not desafio:
        raise HTTPException(status_code=404, detail="Desafío no encontrado")
    
    # Si el que envía es el Jugador 1 actualizando su resultado
    if data.nombre_jugador == desafio.jugador1_nombre:
        desafio.jugador1_puntaje = data.puntaje_total
        desafio.jugador1_tiempo = data.tiempo_total
    # Si el Jugador 2 ya está asignado y vuelve a enviar
    elif desafio.jugador2_nombre and data.nombre_jugador == desafio.jugador2_nombre:
        desafio.jugador2_puntaje = data.puntaje_total
        desafio.jugador2_tiempo = data.tiempo_total
    # Si es un nuevo jugador participando como Jugador 2
    else:
        desafio.jugador2_nombre = data.nombre_jugador
        desafio.jugador2_puntaje = data.puntaje_total
        desafio.jugador2_tiempo = data.tiempo_total
        desafio.estado = "finalizado"  # Al registrar al J2, el desafío se completa
        
    db.commit()
    db.refresh(desafio)
    
    ganador = None
    if desafio.estado == "finalizado":
        if (desafio.jugador1_puntaje or 0) > (desafio.jugador2_puntaje or 0):
            ganador = desafio.jugador1_nombre
        elif (desafio.jugador2_puntaje or 0) > (desafio.jugador1_puntaje or 0):
            ganador = desafio.jugador2_nombre
        else:
            # Desempate por menor tiempo total acumulado (gana el que hizo menos segundos)
            if (desafio.jugador1_tiempo or 999) < (desafio.jugador2_tiempo or 999):
                ganador = desafio.jugador1_nombre
            else:
                ganador = desafio.jugador2_nombre

    return {
        "estado": desafio.estado,
        "ganador": ganador,
        "jugador1": {"nombre": desafio.jugador1_nombre, "puntaje": desafio.jugador1_puntaje, "tiempo": desafio.jugador1_tiempo},
        "jugador2": {"nombre": desafio.jugador2_nombre, "puntaje": desafio.jugador2_puntaje, "tiempo": desafio.jugador2_tiempo}
    }