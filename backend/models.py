from sqlalchemy import Column, Integer, String, JSON, Boolean
from database import Base

class QuestionModel(Base):
    __tablename__ = "preguntas"

    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String, nullable=False)
    pregunta = Column(String, nullable=False)
    opciones = Column(JSON, nullable=False)
    respuesta_correcta = Column(String, nullable=False)
    
    # Métricas y control de uso
    veces_correcta = Column(Integer, default=0, nullable=False)
    veces_incorrecta = Column(Integer, default=0, nullable=False)
    dificultad = Column(String, default="normal", nullable=False)
    
    # 👈 Columna nueva clave para rastrear el 75% de uso
    usada = Column(Boolean, default=False, nullable=False)