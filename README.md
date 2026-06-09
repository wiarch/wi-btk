# WI-Print

Captura de pantalla global multiplataforma con Electron + TypeScript.

## Atajo

`Ctrl+Shift+S` — captura pantalla completa, congela en overlay fullscreen, selecciona región, guarda o copia.

## Desarrollo

```bash
npm install
npm run dev
```

## Build instaladores

```bash
npm run build:win      # NSIS .exe (Windows)
npm run build:ubuntu   # .deb + .AppImage
npm run build:arch     # .pkg.tar.zst (pacman)
```

## Linux: dependencias de captura (opcionales)

```bash
# Arch / CachyOS
sudo pacman -S scrot grim xdg-desktop-portal libnotify

# Ubuntu
sudo apt install scrot libnotify-bin xdg-desktop-portal xdg-desktop-portal-gtk
```

## Instalación Ubuntu

Si `apt` falla por paquetes rotos del sistema (ej. `virtualbox-ext-pack`), arregla primero:

```bash
sudo dpkg --remove --force-remove-reinstreq virtualbox-ext-pack
sudo apt --fix-broken install
```

O usa el `.AppImage` en `release/` — no requiere `apt`.
