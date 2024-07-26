from redis_manager import RedisManager
from flow_sensor import start_flow_sensor_thread
from pressure_sensor import start_pressure_sensor_thread
from valve_controller import start_valve_control_thread

if __name__ == "__main__":
    redis_manager = RedisManager()

    # Iniciar hilos de sensores y controlador de válvulas
    flow_thread = start_flow_sensor_thread(redis_manager)
    pressure_thread = start_pressure_sensor_thread(redis_manager)
    valve_thread = start_valve_control_thread(redis_manager)

    # Mantener el hilo principal en ejecución, unir hilos de sensores y controlador de válvulas
    flow_thread.join()
    pressure_thread.join()
    valve_thread.join()

