# WI-BTK 🚀 (WI Basic Tool Kit)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)
![Status](https://img.shields.io/badge/status-In_Development-orange.svg)

**WI-BTK** es un kit de herramientas básicas y avanzadas todo en uno para Windows y Linux. Inspirado en el minimalismo y la potencia de herramientas de optimización, WI-BTK unifica utilidades multimedia, automatización, productividad y control remoto en una sola aplicación nativa, ligera y fluida.

Olvídate de instalar 15 aplicaciones diferentes. WI-BTK lo tiene todo bajo el mismo techo.

## 🛠️ Características Principales (Módulos)

El ecosistema se divide en 5 categorías clave:

### 📹 1. Multimedia & Captura
* **Captura de Pantalla Avanzada:** Captura de áreas, ventanas, pantalla completa, con editor integrado (flechas, texto, difuminado).
* **Grabador de Pantalla (+ Estilo Loom):** Grabación de pantalla completa o ventanas con superposición de cámara web circular, ideal para tutoriales y feedback rápido.
* **Cámara con Filtros y Efectos:** Utilidad de cámara independiente con filtros en tiempo real, fondos virtuales y efectos visuales.
* **Grabador de Audio + Efectos:** Grabación de notas de voz y audio del sistema con moduladores de voz, cancelación de ruido y efectos.
* **Visor de Imágenes y Reproductor de Video:** Visores nativos ultra rápidos, compatibles con múltiples formatos, ligeros y sin lag de carga.

### 🤖 2. Automatización & Productividad
* **AutoClicker con Grabación de Macros:** Registra de forma inteligente los movimientos del mouse, clics y pulsaciones de teclado para reproducirlos en bucle o con temporizador.
* **Gestor de Macros de Sistema:** Automatiza tareas complejas dentro de la PC (abrir apps, ejecutar comandos, automatizar flujos de archivos) mediante disparadores o atajos de teclado.

### 🌐 3. Conectividad & Herramientas de Red
* **Control Remoto (Tipo AnyDesk):** Conexión segura de escritorio remoto (peer-to-peer) para controlar o compartir tu pantalla entre dispositivos Windows/Linux.
* **Probador de Velocidad de Internet:** Medidor integrado de Ping, Jitter, velocidad de bajada y subida con historial de pruebas.

### 🎨 4. Creatividad & Utilidades de Diseño
* **Pizarra Virtual (Tipo Excalidraw):** Lienzo infinito con estética de dibujo a mano alzada para diagramar, hacer brainstorming y esbozar ideas rápidamente de forma local.
* **Color Picker (Selector de Color):** Herramientas para desarrolladores y diseñadores. Lupa de pantalla, selector de color con un clic y conversión instantánea a HEX, RGB, HSL.

### 📅 5. Utilidades Diarias & Widgets
* **Traductor Instantáneo:** Traducción de texto multilingüe sin necesidad de abrir el navegador.
* **El Clima:** Información meteorológica detallada y pronósticos basados en tu ubicación actual.
* **Tiempo Completo:** Reloj mundial, Alarmas personalizadas, Cronómetro preciso y Temporizador Pomodoro.
* **Calendario Dinámico:** Agenda ligera para organizar tus días y recordatorios locales.
* **Calculadora Avanzada:** Modo estándar, científico y conversor de unidades integrado.

---

## 🚀 Arquitectura y Stack Tecnológico

WI-BTK está construido con un enfoque **Offline-First** y un modelo de seguridad **Zero-Knowledge** (tus datos de control remoto, grabaciones y configuraciones nunca tocan servidores de terceros de manera insegura).

* **Frontend / UI:** [Tu Framework favorito, ej: React / Tailwind CSS o Flutter]
* **Core / Backend de Sistema:** [Ej: Rust / Tauri / C# o C++ para interactuar con las APIs nativas de Windows/Linux]
* **Base de Datos Local:** SQLite / LocalStorage cifrado.

---

## 📦 Instalación (Próximamente)

```bash
# Clonar el repositorio
git clone [https://github.com/tu-usuario/wi-btk.git](https://github.com/tu-usuario/wi-btk.git)

# Instalar dependencias
cd wi-btk
npm install # o el comando de tu stack

# Compilar en modo desarrollo
npm run dev
