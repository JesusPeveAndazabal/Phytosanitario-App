from gpiozero import OutputDevice
import time
import threading
import redis
import json
from redis_manager import RedisManager

# Pines para el canal 20 IZQUIERDA
IN1 = OutputDevice(24)
IN2 = OutputDevice(23)

# Pines para el canal 21 DERECHA
IN3 = OutputDevice(12) #era 8 para py4
IN4 = OutputDevice(25)

def pulse_valve(in1, in2, direction):
    if direction == "open":
        in1.on()
        in2.off()
    else:  # close
        in1.off()
        in2.on()

def valve_control_thread(redis_manager):
    valve_20_state = False
    valve_21_state = False
    pubsub = redis_manager.subscribe('commands')
    last_update_time = 0
    update_interval = 1  # Enviar actualizaciones cada 1 segundo

    try:
        while True:
            current_time = time.time()
            # Verificar mensajes en el canal de comandos
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                print(f"Mensaje recibido: {message}")  # Debug
                data = json.loads(message['data'].decode('utf-8'))
                
                actions = []
                
                if '20' in data:
                    new_state = data['20']
                    if new_state != valve_20_state:
                        actions.append(('20', IN1, IN2, "open" if new_state else "close"))
                        valve_20_state = new_state
                
                if '21' in data:
                    new_state = data['21']
                    if new_state != valve_21_state:
                        actions.append(('21', IN3, IN4, "open" if new_state else "close"))
                        valve_21_state = new_state
                
                # Ejecutar todas las acciones en hilos separados
                threads = []
                for action in actions:
                    valve, in1, in2, direction = action
                    thread = threading.Thread(target=pulse_valve, args=(in1, in2, direction))
                    threads.append(thread)
                    thread.start()
                
                # Esperar a que todas las acciones se completen
                for thread in threads:
                    thread.join()

            # Enviar actualizaciones periódicas
            if current_time - last_update_time >= update_interval:
                redis_manager.publish('responses', json.dumps({20: valve_20_state}))
                redis_manager.publish('responses', json.dumps({21: valve_21_state}))
                last_update_time = current_time
            
            time.sleep(0.1)  # Pequeña pausa para no sobrecargar el CPU

    except KeyboardInterrupt:
        print("Control de válvulas interrumpido.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Cerrar todos los dispositivos GPIO
        for device in [IN1, IN2, IN3, IN4]:
            device.close()

def start_valve_control_thread(redis_manager):
    thread = threading.Thread(target=valve_control_thread, args=(redis_manager,))
    thread.start()
    return thread

if __name__ == "__main__":
    redis_manager = RedisManager()
    start_valve_control_thread(redis_manager)