# WI-BTK — WI Basic Tool Kit

**WI-BTK** es una suite modular de herramientas de escritorio para **Windows y Linux**. Reúne utilidades de captura, multimedia, automatización, productividad, sistema y conectividad en una sola aplicación base.

## Una aplicación base, solo las herramientas que necesitas

WI-BTK está evolucionando hacia un modelo modular:

- Instala únicamente el núcleo de WI-BTK.
- Explora un catálogo de módulos desde el panel integrado.
- Descarga e instala cada herramienta bajo demanda.
- Actualiza o desinstala módulos individualmente.
- Consulta compatibilidad, tamaño de descarga, espacio requerido y permisos antes de instalar.
- Mantén los módulos opcionales separados del núcleo para reducir el tamaño inicial y el consumo de recursos.

**El catálogo e instalador modular todavía están planificados; no están implementados en la versión actual.** Actualmente, los módulos existentes forman parte del mismo paquete de la aplicación y algunos se inicializan desde el proceso principal.

## WI-Rec: módulo de captura

**WI-Rec** es el módulo dedicado a captura de pantalla, grabación, anotación y selección de color. No es el nombre de toda la suite.

El repositorio contiene además módulos de utilidades como WI-Click, WI-Booster, WI-Calc, WI-Clock, WI-Notes, WI-Rate, WI-Netest, WI-Cam, WI-View, WI-Remote, WI-Weather, WI-Widget, WI-System, WI-Dimmer, WI-Translate, WI-Draw y WI-Device. La disponibilidad y el grado de soporte varían según el módulo y el sistema operativo.

## Plataformas

- **Windows 10/11 x64:** plataforma de soporte principal para las funciones que dependen de APIs de Windows.
- **Linux x64:** objetivo de distribución mediante paquetes Debian/Ubuntu y AppImage; existe también un comando de empaquetado Arch/pacman. El soporte funcional depende del entorno gráfico, compositor, permisos y herramientas del sistema.
- **Wayland/X11:** las funciones de captura, atajos globales y control de ventanas pueden comportarse de forma diferente según el compositor. No se debe asumir paridad total entre escritorios.

Cada módulo deberá declarar sus plataformas compatibles y capacidades. Las funciones no disponibles deben aparecer como incompatibles o deshabilitadas, no fallar silenciosamente.

## Arquitectura y tecnologías actuales

- **Runtime de escritorio:** Electron 35.
- **Lenguaje:** TypeScript 5.8.
- **Empaquetado:** electron-builder.
- **Sistema:** adaptadores nativos y herramientas específicas por plataforma.
- **Configuración:** almacenamiento local por módulo.

La arquitectura modular del catálogo, la descarga bajo demanda y el aislamiento de módulos son objetivos de desarrollo, no capacidades ya entregadas.

## Desarrollo

Requisitos: Node.js compatible con las dependencias del proyecto y npm.

```bash
git clone https://github.com/wiarch/wi-btk.git
cd wi-btk
npm install
npm run dev
```

### Compilación

```bash
npm run build
npm run build:win
npm run build:ubuntu
npm run build:arch
```

Los comandos de empaquetado deben ejecutarse y validarse en sus sistemas objetivo; su presencia no garantiza por sí sola que todos los módulos funcionen en cada distribución.

## Documentación

- [Definición del producto](./docs/PRODUCT.md)
- [Arquitectura modular y catálogo](./docs/MODULE-ARCHITECTURE.md)
- [Compatibilidad Windows/Linux](./docs/PLATFORM-SUPPORT.md)
- [Roadmap](./docs/ROADMAP.md)
- [Política de seguridad](./SECURITY.md)
- [Instrucciones para agentes de desarrollo](./CLAUDE.md)
- [Brief de implementación](./PROMPT.md)

## Estado del proyecto

WI-BTK está en desarrollo activo. La suite contiene código funcional en distintos módulos, pero no todos tienen el mismo nivel de madurez ni soporte multiplataforma. Consulta el roadmap y la documentación antes de asumir que una función está lista para producción.

## Licencia

MIT. Consulta el archivo de licencia correspondiente y conserva los avisos de terceros incluidos en el proyecto.
