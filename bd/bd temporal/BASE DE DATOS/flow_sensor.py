from gpiozero import Button
import time
from collections import deque
import threading
import redis
import json
from redis_manager import RedisManager

FLOW_SENSOR_PIN = 18
CALIBRATION_FACTOR = 300
MEASUREMENT_INTERVAL = 1  # Intervalo de medición en segundos
MOVING_AVERAGE_SIZE = 3  # Número de lecturas para la media móvil

pulse_count = 0
flow_readings = deque(maxlen=MOVING_AVERAGE_SIZE)
total_volume = 0  # Inicializamos el volumen total

def count_pulse():
    global pulse_count
    pulse_count += 1

def calculate_flow_rate():
    global pulse_count
    flow_rate = (pulse_count / CALIBRATION_FACTOR) * 60  # L/min
    pulse_count = 0
    return flow_rate

def reset_sensor():
    global pulse_count, total_volume, flow_readings
    pulse_count = 0
    total_volume = 0
    flow_readings.clear()
    print("Sensor reset. Pulse count and total volume set to 0.")

def flow_sensor_thread(redis_manager):
    global total_volume
    
    # Configurar el sensor de flujo con gpiozero
    flow_sensor = Button(FLOW_SENSOR_PIN, pull_up=True)
    flow_sensor.when_pressed = count_pulse

    try:
        print("Midiendo caudal. Presiona Ctrl+C para salir.")
        last_time = time.time()
        # Suscribirse al canal de reinicio
        pubsub = redis_manager.subscribe('commands')
        while True:
            current_time = time.time()
            if current_time - last_time >= MEASUREMENT_INTERVAL:
                flow_rate = calculate_flow_rate()
                flow_readings.append(flow_rate)
                average_flow = sum(flow_readings) / len(flow_readings)
                # Calcular el volumen acumulado
                total_volume += average_flow * (MEASUREMENT_INTERVAL / 60.0)  # Litros
                # Preparar el diccionario de lectura para enviar
                caudal = {
                    2: round(average_flow, 2)
                }
                volumen = {
                    5: round(total_volume, 2)
                }
                # Publicar en Redis
                redis_manager.publish('responses', caudal)
                redis_manager.publish('responses', volumen)
                last_time = current_time
            # Verificar mensajes en el canal de reinicio
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                print(f"Mensaje recibido: {message}")  # Debug
                data = json.loads(message['data'].decode('utf-8'))
                if '5' in data and data['5'] == 'B':
                    print("Reinicio del sensor recibido.")
                    reset_sensor()
            time.sleep(0.1)  # Pequeña pausa para no sobrecargar el CPU
    except KeyboardInterrupt:
        print("Medición interrumpida.")
    finally:
        flow_sensor.close()

def start_flow_sensor_thread(redis_manager):
    thread = threading.Thread(target=flow_sensor_thread, args=(redis_manager,))
    thread.start()
    return thread

if __name__ == "__main__":
    redis_manager = RedisManager()
    start_flow_sensor_thread(redis_manager)
    