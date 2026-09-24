# SC Whiteboard

Premium interactive web whiteboard inspired by Note 3 teaching software.

**Live-ready static app** with glassmorphism UI, multi-page canvas, professional drawing tools, and classroom-friendly features.

## Features

### Drawing & Annotation
- Pen, highlighter, eraser, laser pointer
- Adjustable color, thickness, and opacity
- Perfect shapes: rectangle, ellipse, line, arrow, triangle
- Shape recognition-style snap (clean edges)
- Pressure-like stroke variation on supported devices

### Pages & Organization
- Unlimited pages with thumbnail strip
- Add, duplicate, delete, reorder pages
- Quick page navigation

### Interaction
- Select, move, and resize objects
- Undo / Redo (keyboard + toolbar)
- Zoom (mouse wheel / pinch) and pan (space + drag or two-finger)
- Spotlight / focus mode for presentations
- Fullscreen teaching mode

### Content
- Sticky notes
- Text boxes
- Image import (drag & drop or file picker)
- Background themes: plain, grid, ruled, dotted, dark classroom, gradient

### Polish
- Light / Dark / System theme
- Glassmorphism toolbar and panels
- Smooth animations with reduced-motion support
- Touch, mouse, and stylus friendly
- Keyboard shortcuts
- Local storage auto-save
- Export current page or all pages as PNG

## Quick Start

Open `index.html` in a modern browser, or serve locally:

```bash
npx serve .
# or
python -m http.server 8080
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `P` | Pen |
| `H` | Highlighter |
| `E` | Eraser |
| `L` | Line / shapes cycle |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+S` | Export PNG |
| `Space` + drag | Pan |
| `Delete` | Delete selection |
| `F` | Toggle fullscreen |
| `[` / `]` | Decrease / increase stroke |

## Project Structure

```
index.html          # App shell
css/styles.css      # Design system + glass UI
js/engine.js        # Canvas engine, strokes, shapes, pages
js/ui.js            # Toolbar, panels, themes, shortcuts
js/app.js           # Bootstrap + persistence
.github/workflows/ci.yml
```

## CI

GitHub Actions runs on every push to `main`:
- Validates HTML structure
- Checks required files exist
- Basic JS syntax check

## Browser Support

Chrome, Edge, Firefox, Safari (latest). Best experience with pointer/stylus support.

---

Built for productivity, study, and teaching.  
**SC Infinite**
