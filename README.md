[![Angular Logo](https://www.vectorlogo.zone/logos/angular/angular-icon.svg)](https://angular.io/) [![Electron Logo](https://www.vectorlogo.zone/logos/electronjs/electronjs-icon.svg)](https://electronjs.org/)

<!-- ![Maintained][maintained-badge]
[![Make a pull request][prs-badge]][prs]
[![License][license-badge]](LICENSE.md)

[![Linux Build][linux-build-badge]][linux-build]
[![MacOS Build][macos-build-badge]][macos-build]
[![Windows Build][windows-build-badge]][windows-build]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter] -->

# Introducción

Arranque y empaquete su proyecto con Angular 13 y Electron 17 (Typescript + SASS + Hot Reload) para crear aplicaciones de escritorio.

Actualmente corre con:

- Angular v13.2.4
- Electron v17.1.0

Con esta muestra, puede:

- Ejecutar la aplicación en un entorno de desarrollo local con Electron & Hot reload
- Ejecute su aplicación en un entorno de producción
- Empaquete su aplicación en un archivo ejecutable para Linux, Windows y Mac

/!\ La recarga en caliente solo pertenece al proceso de renderizado. El proceso principal de Electron no se puede recargar en caliente, solo se puede reiniciar.

/!\ Angular CLI & Electron Builder necesita Node 14 o posterior para funcionar correctamente.

## Empezando


*Instale dependencias con npm (utilizado por el proceso de representación de Electron):*

``` bash
npm install --force
```

Hay un problema con `yarn` y `node_modules` cuando el empaquetador crea la aplicación. Utilice `npm` como administrador de dependencias.

Si desea generar componentes Angular con Angular-cli , **DEBE**instalar `@angular/cli` en el contexto global de npm.
Siga la [documentación de Angular-cli] (https://github.com/angular/angular-cli) si había instalado una versión anterior de `angular-cli`.

``` bash
npm install -g @angular/cli
```

*Instale las dependencias de NodeJS con npm (utilizado por el proceso principal de Electron):*

``` bash
cd app/
npm install --force
```

¿Por qué dos paquetes.json? Este proyecto sigue [la estructura de dos paquetes.json de Electron Builder] (https://www.electron.build/tutorials/two-package-structure) para optimizar el paquete final y aún poder usar la función Angular `ng add`.

## Construir para el desarrollo

- **En una ventana de terminal** -> npm start

¡Bien! ¡Ahora puede usar la aplicación Angular + Electron en un entorno de desarrollo local con recarga en caliente!

El código de la aplicación es administrado por `app/main.ts`. En este ejemplo, la aplicación se ejecuta con una aplicación Angular simple (http://localhost:4200) y una ventana Electron. \
El componente Angular contiene un ejemplo de importación de librerías nativas de Electron y NodeJS. \
Puede deshabilitar "Herramientas de desarrollador" comentando `win.webContents.openDevTools();` en `app/main.ts`.

### Configuración importante 

Para los diversos modos de trabajo existe una configuración en los archivos `bd/conf.env/` que tienen la estructura:

```
TOKEN=c7f14f4e4339dd99b0ef31e118f722e94fbd1012d8045eb7bab291d12eb4ce85a0
URL_REST=https://ps-test.fitosatbeta.com
N_DEVICES=4
DEVICE_1=COM4
DEVICE_2=COM29
DEVICE_3=COM6
DEVICE_4=COM36
    
```

Estas configuraciones deben ser establecidas antes de empezar el desarrollo o la construcción de la aplicación , define los puertos correspondientes y añada la cantidad de dispositivos que trabajaran.

## Estructura del proyecto

| Folder | Description                                      |
|--------|--------------------------------------------------|
| app    | Carpeta de proceso principal de Electron (NodeJS)            |
| src    | Carpeta de proceso del renderizador de Electron (Web / Angular) |

## Modo Navegador (Angular)

¿Quizás solo desea ejecutar la aplicación en el navegador con recarga en caliente? Simplemente ejecute `npm run ng:serve:web`.

## ¿Puede usar una lib específica (como rxjs) en el hilo principal de Electron?

¡SÍ! ¡Puedes hacerlo! Simplemente importando su biblioteca en la sección de dependencias de npm de `app/package.json` con `npm install --save XXXXX`. \
Se cargará con Electron durante la fase de construcción y se agregará a su paquete final. \
Luego use su biblioteca importándola en el archivo `app/main.ts`.

## Pruebas E2E

Los scripts de prueba de E2E se pueden encontrar en la carpeta `e2e`.

| Command       | Description               |
|---------------|---------------------------|
| `npm run e2e` | Ejecutar pruebas de extremo a extremo  |

Nota: para que funcione detrás de un proxy, puede agregar esta excepción de proxy en su terminal
`export {no_proxy,NO_PROXY}="127.0.0.1,localhost"`

## Depurar con VsCode

[VsCode](https://code.visualstudio.com/) ¡La configuración de depuración está disponible! Para usarlo, necesita la extensión [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome).

Luego establezca algunos puntos de interrupción en el código fuente de su aplicación.

Finalmente desde VsCode presione **Ctrl+Shift+D**y seleccione **Depuración de aplicación**y presione **F5**.

Tenga en cuenta que la recarga en caliente solo está disponible en el proceso Renderer.

## Comandos incluidos

**Estos comandos se encuentran en el archivo package.json sección scripts, podrá modificarlos acorde a los requerimientos que crea conveniente.**

| Comando                  | Descripción                                                                                           |
|--------------------------|-------------------------------------------------------------------------------------------------------|
| `npm run ng:serve`       | Ejecute la aplicación en el navegador web (modo DEV)                                                         |
| `npm run web:build`      | Cree la aplicación que se puede usar directamente en el navegador web. Sus archivos construidos están en la carpeta /dist. |
| `npm run electron:local` | Construya la aplicación e inicie Electron de manera local                                                    |
| `npm run postinstall`    | Prepare los archivos y dependencias para crear los ejecutables (establecer el S.O. y la arquitectura correspondiente) |
| `npm run electron:build` | Construya la aplicación y crea un ejecutable de aplicación basado en su sistema operativo, el archivo de configuración es `electron-builder.json`                |

**La aplicación está optimizada. Solo la carpeta /dist y las dependencias de NodeJS se incluyen en el paquete final.**

## Despliegue del Aplicativo en una memoria SD vacia para el procesador (Raspberry)

- Clonar el sistema operativo en la memoria (para el py4 y py5 son S.O. diferentes)
- Configurar idioma/pais/zona horaria etc
- Conectar a internet
- Activar permisos ssh (está en el icono del rasberry)
- Remotear desde otra pc por ejempo: ssh atom@192.168.205.50
- Clonar el proyecto dentro de documentos
- Ingresar a app.component.ts y quitar \r
- Guardar con "control x" luego "y" después enter
- Ir a redis.service.ts (/home/atom/Documentos/Phytosanitario-App/src/app/core/services/arduino) y cambiar la ip por localhost 
- Ir a atom@raspberrypi y ejecutar el comando curl -fsSL https://fnm.vercel.app/install | bash
- Ejecutar el comando sudo reboot now
- Volver a remotear con ssh atom@numero_ip
- Ejecutar fnm install 18
- Ejecutar node -v y verificar que tengamos la version 18
- Ir a la carpeta Phytosanitario-app y ejecutar npm install
- Ingresar al proyecto (Phytosanitario-App/) y ejecutar el comando npm 'run electron-build'

Luego de haber construido la imagen del aplicativo , dentro de la carpeta 'relese' se creará el archivo .appimage, lo copiamos a documentos y le cambiamos de nombre a ScalePhyto.AppImage
o el nombre que se desee (recuerde cambiarlo tambien en el archivo de arranque del procesador) , copianmos este archivo a 'Documentos' y ejecutamos el siguiente comando 'sudo chmod +x ScalePhyto.AppImage' , tambien creamos una carpeta bd y dentro el archivo conf.env

```
TOKEN=c7f14f4e4339dd99b0ef31e118f722e94fbd1012d8045eb7bab291d12eb4ce85a0 //
URL_REST=https://ps-test.fitosatbeta.com
N_DEVICES=5
DEVICE_1=/dev/ttyUSB0
DEVICE_2=/dev/ttyUSB1
DEVICE_3=/dev/ttyUSB2
DEVICE_4=/dev/ttyAMA0
DEVICE_5=/dev/ttyS0
```

**Para saber cual es el puerto serial que está usando el Arduino use el comando
`ls /dev/tty*`** , por lo general será `/dev/ttyACM0` o `/dev/ttyUSB0` , y si esta usando el puerto serial del Procesador en el raspberry pi 4 , el puerto seria 'S0' y si es el raspberry pi 5 el puerto seria 'AMA0'.

## Construir la imagen del aplicativo y configurar arranque de la aplicación al iniciar el procesador

- Ingresar a la siguiente ruta : cd .config/autostart/ 
- Editar el arhivo 'scale.desktop' y si no esta creado , deberia tener este contenido : 

```
#!/usr/bin/env xdg-open
[Desktop Entry]
Encoding=UTF-8
Type=Application
Name=Scale
Exec=sh -c "cd /home/atom/Documentos/; ./ScalePhyto.AppImage --disable-gpu-sandbox"
Terminal=true
StartupNotify=true
Name[en_GB]=Scale
X-KeepTerminal=true
Path=/home/atom/Documentos/

```

- Si quisiera quitar el arranque de la aplicacion por x motivos , borre el 'cd' y guarde ("Control + x") + 'y' + Enter para confirmar.

## Despliegue de Redis en el procesador (Raspberry)

	** Instaladores para el procesador (Raspberry pi 4) ** :  

  | Comando                        			                           | Descripción                                                                          |
  |----------------------------------------------------------------|--------------------------------------------------------------------------------------|
  | `pip install adafruit-blinka adafruit-circuitpython-ads1x15`   | Instala las biblioteca necesarias para trabajar con sensores analogicos y digitales. |
  | `pip install redis`                                            | Instala la biblioteca del cliente de Redis para Python.									 				    |
  | `pip install RPi.GPIO` 	                                       | Permite a los scripts de Python interactuar co los pines GPIO.                       |
  | `sudo apt install redis-server`                                | Instala el servidor Redis en un sistema basado en Debian. 														|
  | `sudo systemctl status redis` 	                               | Verifica el estado del servidor de Redis.															 				      |      
 

	** Instaladores para el procesador (Raspberry pi 5) ** :

  | Comando                        			                                                       | Descripción                                                          |
  |--------------------------------------------------------------------------------------------|----------------------------------------------------------------------|
  | `sudo apt install python3-redis`                                                           | Instala los paquetes necesarios del cliente Redis para Python3.      |
  | `sudo apt install redis-server`                                                            | Instala el servidor Redis en un sistema basado en Debian.						|
  | `sudo systemctl status redis` 	                                                           | Verifica el estado del servidor de Redis.                            |
  | `sudo pip3 install adafruit-blinka adafruit-circuitpython-ads1x15 --break-system-packages` | Instala las bibliotecas no disponibles en los repositorios. 					|
  | `sudo apt install python3-gpiozero` 	                                                     | Bibioteca que simplifica el control de pines GPIO en el procesador.  |      

## Configurar el arranque del Script de Python si esta usando la conexión por pines y Redis

- Ingresar a la siguiente ruta : cd /etc/systemd/system/
- Crear un arhivo que sera un nuevo servicio que añadiras , por ejemplo puede ser "app.service".
- En este tendra que tener el siguiente contenido : 

```
[Unit]
Description=Script de Python para Redis
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/atom/Documentos/"Nombre del script".py
WorkingDirectory=/home/atom/Documentos
StandardOutput=inherit
StandardError=inherit
Restart=always
User=atom

[Install]
WantedBy=multi-user.target
```

- Despues ingresa los siguientes comandos : 

| Comando                        			| Descripción                                                                                           |
|-------------------------------------------|-------------------------------------------------------------------------------------------------------|
| `sudo systemctl daemon-reload`       		| Recargar los cambios añadidos.                                                         				|
| `sudo systemctl enable "Nombre".service`  | Arrancar el servicio desde que arranca el procesador.									 				|
| `sudo systemctl status "Nombre".service` 	| Verificar estado del servicio.                                                  		 				|
| `sudo systemctl start "Nombre".service`   | Iniciar el servicio. 																	 				|
| `sudo systemctl stop "Nombre".service` 	| Poner en pausa el servicio.															 				|      

## Configurar el Aplicativo Phytosanitario del tractor si se trabajara con Redis

- Ingresar a la carpeta del proyecto, usualmente se encuentra en la siguiente ruta : home/atom/Documentos/Phytosanitario-App/
- Navegar hasta la carpeta 'Services' y entrar al directorio 'arduino' , y editas el archivo 'redis.service.ts'.
- En el metodo 'connectToRedis' , cambias el host a 'localhost' si en caso lo arrancaras desde el procesador , pero si estas haciendo pruebas locales deberas cambiar el host a el ip de la red que te quieras conectar, 

** Si se desea modificar o añadir nuevos canales al servicio deberas crear nuevos metodos para subscribirte y/o publicar en ellos. **

## Conectarte remotamente con el procesador para compartir pantalla mediante 'RealVNC'

- Por defecto el procesador pi 4 y el 5 tienen incluido este servicio , para activalor deberas ingresar a la opcion de configuración del Raspberry y activar la opcion de 'VNC' y reiniciar el procesador.
- Ahora deberas ingresar este comando en la terminal  'ifconfig' , es para que sepas a que ip deberias conectarte por ejemplo puede ser : '192.168.174.124'
- Esta ip deberas ingresar en el aplicativo RealVNC que tendrias que tener descargado ya , te dejo el link para que lo descargues : https://www.realvnc.com/es/#:~:text=RealVNC%C2%AE%3A%20software%20de%20acceso,escritorio%20y%20dispositivos%20m%C3%B3viles%20%7C%20RealVNC
- Ingresas el ip , te pedira el usuario y la contraseña de tu procesador y la ingresas , y ya deberias estar conectado remotamente a tu procesador.

### Notas adicionales

** En caso se despliegue el aplicativo en el procesador , revisar los siguiente puntos : **

	- Revisar el app.component.ts , a veces para pruebas locales puede estar comentado el 'setInterval' que es el encargado de enviar los registros al servidor.
	- Revisar el arduino.service.ts , comentar o descomentar la función que regula de acuerdo a la velocidad : this.regularPresionSiCambio(data[`${Sensor.SPEED}`]);.
	- Revisar el archivo conf.env si todo esta configurado correctamente , tanto el servidor y los puertos seriales.
	- Revisar en el archivo redis.service si el 'host' esta correctamente configurado , cuando se trabaja localmente en el procesador solo es 'localhost'.









 




