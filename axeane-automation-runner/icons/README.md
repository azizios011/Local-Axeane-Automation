# `icons/` — Tauri Application Icons

This folder holds the application icons that Tauri uses for the window, the
installer, and platform-specific surfaces (Dock on macOS, taskbar on
Windows, etc.).

## Required files

The `tauri.conf.json` references:

- `icons/icon.png` — base PNG, used as the source of truth
- `icons/icon.ico` — Windows multi-resolution ICO

For a production build you also typically want:

- `icons/32x32.png`
- `icons/128x128.png`
- `icons/128x128@2x.png`
- `icons/icon.icns` (macOS)

## Generating the full set

Tauri ships a CLI helper:

```bash
# From axeane-automation-runner/
cargo tauri icon path/to/source-icon.png
```

It will emit all required sizes and formats into this folder.

## Placeholders

For local development you can drop any 256x256 PNG into `icon.png` and use
this online converter to mint an `.ico`:

> https://convertico.com/

The `tauri dev` command will work even with placeholder icons — they only
become mandatory for `tauri build`.
