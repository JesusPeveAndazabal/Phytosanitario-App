import time
import board
import busio
import adafruit_ads1x15.ads1015 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
import threading
import redis
import json
from redis_manager import RedisManager
from gpiozero import OutputDevice

# Configuración GPIO
GPIO_INCREASE = OutputDevice(20)
GPIO_DECREASE = OutputDevice(21)

# Crear el bus I2C
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1015(i2c)
chan = AnalogIn(ads, ADS.P0)

# Constantes para la conversión de valores
pressure_zero = 0.5
pressure_max = 4.5
pressure_transducer_max_psi = 1450.38

# Variables globales
regulador_pressure = 0
in_range_time = 0
is_regulating = False
valve_20_state = False
valve_21_state = False
regulator_open = False
regulation_completed = False
both_valves_were_active = False
new_regulation_requested = False

def read_pressure():
    raw_value = chan.voltage
    psi = ((raw_value - pressure_zero) * pressure_transducer_max_psi) / (pressure_max - pressure_zero)
    bar = psi * 0.0689476
    return max(round(bar, 1), 0)

def adjust_pressure(current_pressure, target_pressure, tolerance=0.5):
    global in_range_time, is_regulating, regulator_open, regulation_completed

    if not is_regulating or regulation_completed:
        GPIO_INCREASE.off()
        GPIO_DECREASE.off()
        return

    current_time = time.time()

    if abs(current_pressure - target_pressure) <= tolerance:
        GPIO_INCREASE.off()
        GPIO_DECREASE.off()
        
        if in_range_time == 0:
            in_range_time = current_time
        elif current_time - in_range_time >= 10:
            is_regulating = False
            regulation_completed = True
            print("Presión estable por 10 segundos. Regulación completada.")
    else:
        in_range_time = 0
        if current_pressure < target_pressure - tolerance:
            GPIO_INCREASE.on()
            GPIO_DECREASE.off()
            regulator_open = True
        elif current_pressure > target_pressure + tolerance:
            GPIO_INCREASE.off()
            GPIO_DECREASE.on()
            regulator_open = True

def should_regulate(pressure, valve_20, valve_21):
    return pressure > 1 and (valve_20 or valve_21)

def close_regulator():
    global regulator_open
    if regulator_open:
        print("Cerrando el regulador...")
        GPIO_INCREASE.off()
        GPIO_DECREASE.on()
        time.sleep(5)  # Ajusta este tiempo según lo que tarde en cerrarse completamente el regulador
        GPIO_DECREASE.off()
        regulator_open = False
        print("Regulador cerrado.")
    else:
        print("El regulador ya estaba cerrado.")

def stop_regulation():
    global is_regulating, regulation_completed, both_valves_were_active, in_range_time
    is_regulating = False
    regulation_completed = False
    both_valves_were_active = False
    in_range_time = 0
    close_regulator()
    print("Regulación detenida y regulador cerrado si estaba abierto.")

def pressure_sensor_thread(redis_manager):
    global regulador_pressure, is_regulating, in_range_time, valve_20_state, valve_21_state, regulation_completed, both_valves_were_active, new_regulation_requested

    try:
        pubsub = redis_manager.subscribe('commands')
        while True:
            pressure = read_pressure()
            pressure_reading = {3: pressure}
            regulator_reading = {22: regulador_pressure}

            if valve_20_state and valve_21_state:
                both_valves_were_active = True

            if not valve_20_state and not valve_21_state:
                if is_regulating:
                    stop_regulation()
            elif should_regulate(pressure, valve_20_state, valve_21_state):
                if new_regulation_requested or (both_valves_were_active and (not valve_20_state or not valve_21_state)):
                    is_regulating = True
                    in_range_time = 0
                    regulation_completed = False
                    both_valves_were_active = False
                    new_regulation_requested = False
                    print("Iniciando nueva regulación.")
                
                if not regulation_completed:
                    adjust_pressure(pressure, regulador_pressure)
            else:
                if is_regulating:
                    stop_regulation()

            redis_manager.publish('responses', pressure_reading)
            redis_manager.publish('responses', regulator_reading)

            message = pubsub.get_message()
            if message and message['type'] == 'message':
                print(f"Mensaje recibido: {message}")
                data = json.loads(message['data'].decode('utf-8'))
                if '22' in data:
                    regulador_pressure = data['22']
                    new_regulation_requested = True
                    print(f"Regulador de presión ajustado a: {regulador_pressure}. Nueva regulación solicitada.")
                if '20' in data:
                    new_valve_20_state = data['20']
                    if valve_20_state and not new_valve_20_state and not valve_21_state:
                        stop_regulation()
                    valve_20_state = new_valve_20_state
                if '21' in data:
                    new_valve_21_state = data['21']
                    if valve_21_state and not new_valve_21_state and not valve_20_state:
                        stop_regulation()
                    valve_21_state = new_valve_21_state

            time.sleep(1)
    except KeyboardInterrupt:
        print("\nPrograma detenido.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        GPIO_INCREASE.close()
        GPIO_DECREASE.close()

def start_pressure_sensor_thread(redis_manager):
    thread = threading.Thread(target=pressure_sensor_thread, args=(redis_manager,))
    thread.start()
    return thread

if __name__ == "__main__":
    redis_manager = RedisManager()
    start_pressure_sensor_thread(redis_manager)