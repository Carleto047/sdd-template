from sqlalchemy import Column, Integer, String, JSON
from database import Base

class QuestionModel(Base):
    __tablename__ = "preguntas"

    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String, nullable=False)
    pregunta = Column(String, nullable=False)
    opciones = Column(JSON, nullable=False)
    respuesta_correcta = Column(String, nullable=False)
    # Nuevas columnas añadidas
    veces_correcta = Column(Integer, default=0, nullable=False)
    veces_incorrecta = Column(Integer, default=0, nullable=False)
    dificultad = Column(String, default="normal", nullable=False)
