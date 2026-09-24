# SC Whiteboard

Premium interactive web whiteboard inspired by **Note 3** teaching software.

Advanced multi-page canvas with professional drawing tools, classroom teaching utilities, and subject helpers.

## Highlights

- **Drawing:** pen, soft brush, highlighter, eraser, laser
- **Shapes:** line, rectangle, ellipse, arrow, triangle · optional fill · Shift constrains
- **Pages:** add, duplicate, delete, switch with thumbnails
- **Teaching tools:** spotlight, screen curtain, magnifier, timer / countdown, clock
- **Subject tools:** Chemistry periodic table, Math quick formulas, ruler guides
- **Content:** sticky notes, text, image import (file + drag & drop)
- **Canvas:** zoom, pan, undo/redo, select & move
- **Polish:** glass UI, light/dark, backgrounds, color presets, keyboard shortcuts, local save, PNG + JSON export

See [docs/FEATURES.md](docs/FEATURES.md) for full Note 3 parity map.

## Quick start

```bash
# open index.html in a browser, or:
npx serve .
```

## Keyboard

| Key | Action |
|-----|--------|
| V / P / H / E | Select / Pen / Highlighter / Eraser |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Export PNG |
| Space + drag | Pan |
| Delete | Delete selection |
| F | Fullscreen |
| [ ] | Stroke size |
| T | Toggle timer |
| C | Toggle curtain |

## Stack

Static HTML / CSS / JS (Canvas 2D). No build step required.

## CI

GitHub Actions validates structure, HTML shell, JS syntax, and CSS on every push to `main`.

---

**SC Infinite** · Productivity & study tools
