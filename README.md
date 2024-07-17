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

### Despliegue en el procesador (Raspberry)

Después de haber ejecutado los comandos `npm run postinstall` y posteriormente `npm run electron:build` para la construcción
del ejecutable, encontrará una nueva carpeta `dist` donde se encuentra el ejecutable `.AppImage` este deberá copiarlo en alguna carpeta del raspberry y ejecutar el comando `sudo chmod +x [nombrearchivo].AppImage`  para este ejemplo será en `/home/atom/Documents/Scale`, allí deberá crear una carpeta con el nombre `bd` y crear el 
al archivo `conf.env` con lo siguientes parámetros:

```
TOKEN=c7f14f4e4339dd99b0ef31e118f722e94fbd1012d8045eb7bab291d12eb4ce85a0
URL_REST=https://ps-test.fitosatbeta.com
N_DEVICES=4
DEVICE_1=COM4
DEVICE_2=COM29
DEVICE_3=COM6
DEVICE_4=COM36
```

**Para saber cual es el puerto serial que está usando el Arduino use el comando
`ls /dev/tty*`** , por lo general será `/dev/ttyACM0` o `/dev/ttyUSB0` , y si esta usando el puerto serial del Procesador en el raspberry pi 4 , el puerto seria 'S0' y si es el raspberry pi 5 el puerto seria 'AMA0'.

Luego crear el archivo .desktop para iniciar automaticamente la aplicacion en Raspberry con el siguiente contenido:

```
#!/usr/bin/env xdg-open
[Desktop Entry]
Encoding=UTF-8
Type=Application
Name=Scale
Exec=sh -c "cd /home/atom/Documents/Scale; sudo ./[nombre_archivo].AppImage --disable-gpu-sandbox"
Terminal=true
StartupNotify=true
Name[en_GB]=Scale
X-KeepTerminal=true
Path=/home/atom/Documents/Scale
```

Luego copiarlo en la carpeta `/home/atom/.config/autostart` *Si no existe, crear la carpeta*
ejecutar `sudo chmod +x [nombrearchivo].desktop` [Ver Referencia](https://docs.appimage.org/introduction/quickstart.html#using-the-terminal)

A partir de aquí, al momento de iniciar el sistema operativo del Raspberry se ejecutará automáticamente la aplicación Fitosanitario.

### Configurar el S.O. del Raspberry para producción

- Para cambiar el logo de Raspberry por el que se desee, [ver](https://www.tomshardware.com/how-to/custom-raspberry-pi-splash-screen).

**No olvidar que para ver toda modificación del sistema operativo debe reiniciar el procesador**
