"""
Prueba rápida del Desafío. Se ejecuta con el backend prendido:
    python probar_desafio.py
"""
import json
import random
import urllib.error
import urllib.request

BASE = "http://localhost:8000/api/v1/desafio"


def llamar(metodo, url, cuerpo=None):
    datos = json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None
    pedido = urllib.request.Request(url, data=datos, method=metodo, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(pedido) as respuesta:
            return respuesta.status, json.loads(respuesta.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8") or "{}")


def verificar(condicion, mensaje):
    print(("  OK  " if condicion else "  FALLA  ") + mensaje)


estado, creado = llamar("POST", BASE)
verificar(estado == 200, f"Crear desafío (código {creado.get('codigo')})")
codigo = creado["codigo"]

estado, desafio = llamar("GET", f"{BASE}/{codigo}")
verificar(estado == 200 and desafio["total"] == 14, f"El desafío tiene {desafio.get('total')} preguntas (esperadas: 14)")
verificar(all("respuesta_correcta" not in p for p in desafio["preguntas"]), "Las preguntas NO traen la respuesta correcta")


def respuestas_de(elige_siempre_la_primera):
    lista = []
    for p in desafio["preguntas"]:
        opcion = p["opciones"][0] if elige_siempre_la_primera else random.choice(p["opciones"])
        lista.append({"pregunta_id": p["id"], "opcion": opcion, "tiempo_ms": random.randint(2000, 9000)})
    return lista


estado, _ = llamar("GET", f"{BASE}/{codigo}/reporte?jugador_id=ana")
verificar(estado == 403, "Ana no puede ver reportes antes de terminar (403)")

estado, r1 = llamar("POST", f"{BASE}/{codigo}/resultado",
                    {"jugador_id": "ana", "nombre": "Ana", "respuestas": respuestas_de(True)})
verificar(estado == 200, f"Ana envía su resultado: {r1.get('aciertos')}/14")

estado, reporte = llamar("GET", f"{BASE}/{codigo}/reporte?jugador_id=ana")
verificar(estado == 200 and reporte["estado"] == "esperando_rival", "Ana ve 'esperando_rival' hasta que juegue Luis")

estado, _ = llamar("POST", f"{BASE}/{codigo}/resultado",
                   {"jugador_id": "ana", "nombre": "Ana", "respuestas": respuestas_de(True)})
verificar(estado == 409, "Ana no puede enviar dos veces (409)")

estado, r2 = llamar("POST", f"{BASE}/{codigo}/resultado",
                    {"jugador_id": "luis", "nombre": "Luis", "respuestas": respuestas_de(False)})
verificar(estado == 200, f"Luis envía su resultado: {r2.get('aciertos')}/14")

estado, reporte = llamar("GET", f"{BASE}/{codigo}/reporte?jugador_id=ana")
verificar(estado == 200 and reporte["estado"] == "finalizado", "Ana ya ve el reporte completo")
print()
print(f"  Ana : {reporte['yo']['aciertos']}/14 aciertos en {reporte['yo']['tiempo_total_seg']} s")
print(f"  Luis: {reporte['rival']['aciertos']}/14 aciertos en {reporte['rival']['tiempo_total_seg']} s")
print(f"  Ganador (desde Ana): {reporte['ganador']}  ->  {reporte['criterio']}")
print(f"\nCódigo usado en la prueba: {codigo}")