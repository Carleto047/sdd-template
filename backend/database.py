import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL de la base de datos (Render o desarrollo local)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Corrección de compatibilidad para usar psycopg2
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://")
elif DATABASE_URL.startswith("postgresql://") and "+" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

# Configurar argumentos de conexión SSL obligatorios para PostgreSQL en Render
connect_args = {}
if "postgresql" in DATABASE_URL and "sslmode" not in DATABASE_URL:
    connect_args = {"sslmode": "require"}

# Crear el motor de la base de datos
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()