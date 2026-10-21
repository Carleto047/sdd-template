from models import QuestionModel
from database import SessionLocal

preguntas_iesetyfp = [
    QuestionModel(categoria="IESETyFP", pregunta="¿Qué significan las siglas IESETyFP?", opciones=["Instituto de Enseñanza Secundaria, Educación Tecnológica y Formación Pedagógica", "Instituto de Educación Superior, Educación Técnica y Formación Profesional", "Instituto de Especialización Superior en Educación Tecnológica y Formación de Profesores", "Instituto del Estado para la Educación Técnica y Formación Pedagógica"], respuesta_correcta="Instituto de Educación Superior, Educación Técnica y Formación Profesional"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuándo se creó el IESETyFP?", opciones=["En 1982", "En 1985", "En 1987", "En 1993"], respuesta_correcta="En 1987"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuál de estas es una Tecnicatura Superior dictada por el IESETyFP?", opciones=["Tecnicatura Superior en Programación Web", "Tecnicatura Superior en Seguridad, Higiene y Medio Ambiente en el Trabajo", "Tecnicatura Superior en Gestión de Recursos Humanos", "Tecnicatura Superior en Control de Calidad Alimentaria"], respuesta_correcta="Tecnicatura Superior en Seguridad, Higiene y Medio Ambiente en el Trabajo"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuál de estas es otra de las Tecnicaturas Superiores dictadas por el IESETyFP?", opciones=["Tecnicatura en Ciencia de Datos e Inteligencia Artificial", "Tecnicatura Superior en Marketing Digital y Redes", "Tecnicatura en Telecomunicaciones y Conectividad", "Tecnicatura Superior en Desarrollo de Software"], respuesta_correcta="Tecnicatura en Ciencia de Datos e Inteligencia Artificial"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuál de estos Profesorados se dicta en el IESETyFP?", opciones=["Profesorado de Educación Primaria", "Profesorado de Educación Secundaria en Informática", "Profesorado de Educación Tecnológica", "Profesorado en Ciencias de la Educación"], respuesta_correcta="Profesorado de Educación Tecnológica"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuál de estos es otro de los Profesorados dictados por la institución?", opciones=["Profesorado de Educación Secundaria en Física", "Profesorado de Educación Secundaria en Matemática", "Profesorado de Educación Secundaria en Química", "Profesorado de Educación Secundaria en Biología"], respuesta_correcta="Profesorado de Educación Secundaria en Física"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Qué títulos ofrece la institución IESETyFP?", opciones=["Únicamente certificados de cursos de oficios cortos", "Títulos secundarios de orientación exclusivamente técnica", "Ofrece títulos de nivel superior organizados en profesorados y tecnicaturas", "Títulos universitarios de grado y posgrado"], respuesta_correcta="Ofrece títulos de nivel superior organizados en profesorados y tecnicaturas"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuál es el costo de las carreras?", opciones=["Se abona una matrícula mensual fija", "Es gratis", "Varía según la cantidad de materias a cursar por cuatrimestre", "Es arancelado solo para los profesorados"], respuesta_correcta="Es gratis"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuántos años duran los profesorados?", opciones=["3 años", "4 años", "5 años", "2 años"], respuesta_correcta="4 años"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuántos años duran las tecnicaturas?", opciones=["2 años", "3 años", "4 años", "5 años"], respuesta_correcta="3 años"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuáles de estos datos son alguno de los requisitos de inscripción?", opciones=["Pasaporte al día y constancia de CUIL original", "Título secundario o constancia de título en trámite - Documento Nacional de Identidad (DNI)", "Certificado de domicilio analítico legalizado por escribano público", "Carta de recomendación laboral y currículum vitae"], respuesta_correcta="Título secundario o constancia de título en trámite - Documento Nacional de Identidad (DNI)"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Cuáles de estos datos también forman parte de los requisitos de inscripción?", opciones=["Certificado de vacunas obligatorias y dos fotos carnet digitales", "Declaración jurada de ingresos familiares y certificado de reincidencia", "Partida de nacimiento, carpeta colgante - Certificado de buena salud", "Constancia de vacancia escolar y examen psicotécnico aprobado"], respuesta_correcta="Partida de nacimiento, carpeta colgante - Certificado de buena salud"),
    QuestionModel(categoria="IESETyFP", pregunta="¿En qué turnos y horarios se cursa?", opciones=["Únicamente por la mañana", "Turno partido (mañana y siesta)", "Turno nocturno exclusivo para tecnicaturas", "Tarde-vespertino/noche"], respuesta_correcta="Tarde-vespertino/noche"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Las carreras tienen prácticas profesionales?", opciones=["No, la modalidad es 100% teórica", "Solo las tecnicaturas cuentan con esa instancia", "Sí", "Son opcionales y no influyen en la titulación"], respuesta_correcta="Sí"),
    QuestionModel(categoria="IESETyFP", pregunta="¿Dónde se encuentra el IESETyFP?", opciones=["Av. Las Heras 727, Resistencia, Chaco", "Gerardo Varela 79, Resistencia, Chaco", "Av. Castelli 1000, Resistencia, Chaco", "Obligado 150, Resistencia, Chaco"], respuesta_correcta="Gerardo Varela 79, Resistencia, Chaco"),
]

def poblar_base_datos():
    db = SessionLocal()
    try:
        borradas = db.query(QuestionModel).filter(QuestionModel.categoria == "IESETyFP").delete()
        db.add_all(preguntas_iesetyfp)
        db.commit()
        print(f"Se borraron {borradas} preguntas anteriores de IESETyFP.")
        print(f"Se insertaron {len(preguntas_iesetyfp)} preguntas de IESETyFP correctamente.")
    except Exception as e:
        db.rollback()
        print(f"Error al insertar: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    poblar_base_datos()