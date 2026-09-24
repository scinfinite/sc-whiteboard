/**
 * SC Whiteboard — Canvas Engine
 * Handles strokes, shapes, pages, transform, hit-testing, history.
 */
(function (global) {
  const STORAGE_KEY = "sc-whiteboard-v1";

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  class BoardEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      this.dpr = Math.max(1, window.devicePixelRatio || 1);

      this.tool = "pen";
      this.color = "#3b82f6";
      this.size = 4;
      this.opacity = 1;

      this.pages = [this._emptyPage()];
      this.pageIndex = 0;

      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;

      this.drawing = false;
      this.currentStroke = null;
      this.selection = null;
      this.spaceDown = false;
      this.panning = false;
      this.lastPan = null;

      this.undoStack = [];
      this.redoStack = [];
      this.maxHistory = 40;

      this.background = "plain";
      this.spotlight = false;
      this.spotlightPos = { x: 0.5, y: 0.5 };

      this._resize();
      window.addEventListener("resize", () => this._resize());
    }

    _emptyPage() {
      return { id: uid(), objects: [], background: "plain" };
    }

    get page() {
      return this.pages[this.pageIndex];
    }

    _resize() {
      const parent = this.canvas.parentElement;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      this.dpr = Math.max(1, window.devicePixelRatio || 1);
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.render();
    }

    screenToWorld(x, y) {
      return {
        x: (x - this.offsetX) / this.scale,
        y: (y - this.offsetY) / this.scale,
      };
    }

    pushHistory() {
      this.undoStack.push(clone(this.pages));
      if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
      this.redoStack = [];
    }

    undo() {
      if (!this.undoStack.length) return;
      this.redoStack.push(clone(this.pages));
      this.pages = this.undoStack.pop();
      if (this.pageIndex >= this.pages.length) this.pageIndex = this.pages.length - 1;
      this.selection = null;
      this.render();
      this.onChange?.();
    }

    redo() {
      if (!this.redoStack.length) return;
      this.undoStack.push(clone(this.pages));
      this.pages = this.redoStack.pop();
      if (this.pageIndex >= this.pages.length) this.pageIndex = this.pages.length - 1;
      this.selection = null;
      this.render();
      this.onChange?.();
    }

    setTool(tool) {
      this.tool = tool;
      this.selection = null;
      this.render();
      this.onChange?.();
    }

    setColor(c) {
      this.color = c;
    }

    setSize(s) {
      this.size = s;
    }

    setOpacity(o) {
      this.opacity = o;
    }

    setBackground(bg) {
      this.page.background = bg;
      this.background = bg;
      this.render();
      this.onChange?.();
    }

    addPage() {
      this.pushHistory();
      this.pages.push(this._emptyPage());
      this.pageIndex = this.pages.length - 1;
      this.selection = null;
      this.render();
      this.onChange?.();
    }

    duplicatePage() {
      this.pushHistory();
      const copy = clone(this.page);
      copy.id = uid();
      this.pages.splice(this.pageIndex + 1, 0, copy);
      this.pageIndex += 1;
      this.selection = null;
      this.render();
      this.onChange?.();
    }

    gotoPage(i) {
      if (i < 0 || i >= this.pages.length) return;
      this.pageIndex = i;
      this.selection = null;
      this.background = this.page.background || "plain";
      this.render();
      this.onChange?.();
    }

    clearPage() {
      this.pushHistory();
      this.page.objects = [];
      this.selection = null;
      this.render();
      this.onChange?.();
    }

    // ── Pointer handling ──

    pointerDown(sx, sy, shiftKey) {
      if (this.spaceDown) {
        this.panning = true;
        this.lastPan = { x: sx, y: sy };
        return;
      }

      const p = this.screenToWorld(sx, sy);

      if (this.tool === "select") {
        this.selection = this.hitTest(p.x, p.y);
        this.drawing = !!this.selection;
        this._dragStart = p;
        this._selStart = this.selection ? { ...this.selection } : null;
        this.render();
        return;
      }

      if (this.tool === "laser") {
        this.drawing = true;
        return;
      }

      this.pushHistory();
      this.drawing = true;

      if (this.tool === "pen" || this.tool === "highlighter" || this.tool === "eraser") {
        this.currentStroke = {
          id: uid(),
          type: "stroke",
          tool: this.tool,
          color: this.tool === "eraser" ? "#000" : this.color,
          size: this.tool === "highlighter" ? this.size * 3 : this.size,
          opacity: this.tool === "highlighter" ? 0.35 : this.tool === "eraser" ? 1 : this.opacity,
          points: [p],
          erase: this.tool === "eraser",
        };
        this.page.objects.push(this.currentStroke);
      } else if (["line", "rect", "ellipse", "arrow"].includes(this.tool)) {
        this.currentStroke = {
          id: uid(),
          type: "shape",
          shape: this.tool,
          color: this.color,
          size: this.size,
          opacity: this.opacity,
          x1: p.x,
          y1: p.y,
          x2: p.x,
          y2: p.y,
          shift: shiftKey,
        };
        this.page.objects.push(this.currentStroke);
      } else if (this.tool === "sticky") {
        const note = {
          id: uid(),
          type: "sticky",
          x: p.x,
          y: p.y,
          w: 160,
          h: 120,
          text: "Note",
          color: "#fef08a",
        };
        this.page.objects.push(note);
        this.selection = note;
        this.drawing = false;
        this.render();
        this.onChange?.();
        return;
      } else if (this.tool === "text") {
        const text = prompt("Enter text:", "Text");
        if (text) {
          this.page.objects.push({
            id: uid(),
            type: "text",
            x: p.x,
            y: p.y,
            text,
            color: this.color,
            size: Math.max(16, this.size * 3),
          });
          this.render();
          this.onChange?.();
        }
        this.drawing = false;
        return;
      }

      this.render();
    }

    pointerMove(sx, sy, shiftKey) {
      if (this.panning && this.lastPan) {
        this.offsetX += sx - this.lastPan.x;
        this.offsetY += sy - this.lastPan.y;
        this.lastPan = { x: sx, y: sy };
        this.render();
        this.onChange?.();
        return;
      }

      if (this.tool === "laser" && this.drawing) {
        this.onLaser?.(sx, sy);
        return;
      }

      if (!this.drawing) return;
      const p = this.screenToWorld(sx, sy);

      if (this.tool === "select" && this.selection && this._dragStart && this._selStart) {
        const dx = p.x - this._dragStart.x;
        const dy = p.y - this._dragStart.y;
        this._moveObject(this.selection, this._selStart, dx, dy);
        this.render();
        return;
      }

      if (!this.currentStroke) return;

      if (this.currentStroke.type === "stroke") {
        this.currentStroke.points.push(p);
      } else if (this.currentStroke.type === "shape") {
        this.currentStroke.x2 = p.x;
        this.currentStroke.y2 = p.y;
        this.currentStroke.shift = shiftKey;
      }

      this.render();
    }

    pointerUp() {
      this.drawing = false;
      this.panning = false;
      this.lastPan = null;
      this.currentStroke = null;
      this._dragStart = null;
      this._selStart = null;
      this.onLaser?.(null);
      this.render();
      this.onChange?.();
      this.save();
    }

    _moveObject(obj, start, dx, dy) {
      if (obj.type === "stroke") {
        // rebuild from start snapshot
        const orig = start.points || [];
        obj.points = orig.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
      } else if (obj.type === "shape") {
        obj.x1 = start.x1 + dx;
        obj.y1 = start.y1 + dy;
        obj.x2 = start.x2 + dx;
        obj.y2 = start.y2 + dy;
      } else if (obj.type === "sticky" || obj.type === "text" || obj.type === "image") {
        obj.x = start.x + dx;
        obj.y = start.y + dy;
      }
    }

    hitTest(x, y) {
      const objs = this.page.objects;
      for (let i = objs.length - 1; i >= 0; i--) {
        const o = objs[i];
        if (o.type === "sticky") {
          if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
        } else if (o.type === "text") {
          if (x >= o.x && x <= o.x + 200 && y >= o.y - o.size && y <= o.y + 8) return o;
        } else if (o.type === "image") {
          if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
        } else if (o.type === "shape") {
          const minX = Math.min(o.x1, o.x2) - 8;
          const maxX = Math.max(o.x1, o.x2) + 8;
          const minY = Math.min(o.y1, o.y2) - 8;
          const maxY = Math.max(o.y1, o.y2) + 8;
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) return o;
        } else if (o.type === "stroke" && o.points?.length) {
          for (const pt of o.points) {
            if (Math.hypot(pt.x - x, pt.y - y) < Math.max(10, o.size)) return o;
          }
        }
      }
      return null;
    }

    deleteSelection() {
      if (!this.selection) return;
      this.pushHistory();
      this.page.objects = this.page.objects.filter((o) => o.id !== this.selection.id);
      this.selection = null;
      this.render();
      this.onChange?.();
      this.save();
    }

    addImage(img, x, y) {
      this.pushHistory();
      const maxW = 400;
      const scale = Math.min(1, maxW / img.width);
      this.page.objects.push({
        id: uid(),
        type: "image",
        x: x ?? 80,
        y: y ?? 80,
        w: img.width * scale,
        h: img.height * scale,
        src: img.src,
      });
      this.render();
      this.onChange?.();
      this.save();
    }

    zoomAt(sx, sy, delta) {
      const factor = delta > 0 ? 0.9 : 1.1;
      const newScale = Math.min(4, Math.max(0.25, this.scale * factor));
      const wx = (sx - this.offsetX) / this.scale;
      const wy = (sy - this.offsetY) / this.scale;
      this.scale = newScale;
      this.offsetX = sx - wx * this.scale;
      this.offsetY = sy - wy * this.scale;
      this.render();
      this.onChange?.();
    }

    // ── Rendering ──

    render() {
      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // background fill in world space via inverse transform feel
      this._drawBackground(ctx, w, h);

      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.scale, this.scale);

      for (const o of this.page.objects) {
        this._drawObject(ctx, o);
      }

      if (this.selection) {
        this._drawSelection(ctx, this.selection);
      }

      ctx.restore();
    }

    _drawBackground(ctx, w, h) {
      const bg = this.page.background || "plain";
      if (bg === "dark") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);
      } else if (bg === "gradient") {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#1e3a5f");
        g.addColorStop(1, "#312e81");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, w, h);
      }

      // pattern in screen space for simplicity
      ctx.save();
      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.scale, this.scale);
      const extent = 4000;
      if (bg === "grid") {
        ctx.strokeStyle = "rgba(100,116,139,0.25)";
        ctx.lineWidth = 1 / this.scale;
        for (let x = -extent; x < extent; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, -extent);
          ctx.lineTo(x, extent);
          ctx.stroke();
        }
        for (let y = -extent; y < extent; y += 32) {
          ctx.beginPath();
          ctx.moveTo(-extent, y);
          ctx.lineTo(extent, y);
          ctx.stroke();
        }
      } else if (bg === "ruled") {
        ctx.strokeStyle = "rgba(59,130,246,0.25)";
        ctx.lineWidth = 1 / this.scale;
        for (let y = -extent; y < extent; y += 36) {
          ctx.beginPath();
          ctx.moveTo(-extent, y);
          ctx.lineTo(extent, y);
          ctx.stroke();
        }
      } else if (bg === "dots") {
        ctx.fillStyle = "rgba(100,116,139,0.4)";
        for (let x = -extent; x < extent; x += 28) {
          for (let y = -extent; y < extent; y += 28) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2 / this.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    _drawObject(ctx, o) {
      ctx.save();
      if (o.type === "stroke") {
        const pts = o.points;
        if (!pts || pts.length < 1) {
          ctx.restore();
          return;
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = o.size;
        ctx.globalAlpha = o.opacity ?? 1;
        if (o.erase) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.strokeStyle = o.color;
        }
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      } else if (o.type === "shape") {
        ctx.strokeStyle = o.color;
        ctx.lineWidth = o.size;
        ctx.globalAlpha = o.opacity ?? 1;
        ctx.lineCap = "round";
        let x1 = o.x1, y1 = o.y1, x2 = o.x2, y2 = o.y2;
        if (o.shift && (o.shape === "rect" || o.shape === "ellipse")) {
          const s = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
          x2 = x1 + Math.sign(x2 - x1 || 1) * s;
          y2 = y1 + Math.sign(y2 - y1 || 1) * s;
        }
        if (o.shape === "line" || o.shape === "arrow") {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          if (o.shape === "arrow") {
            const ang = Math.atan2(y2 - y1, x2 - x1);
            const len = 12 + o.size;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - len * Math.cos(ang - 0.4), y2 - len * Math.sin(ang - 0.4));
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - len * Math.cos(ang + 0.4), y2 - len * Math.sin(ang + 0.4));
            ctx.stroke();
          }
        } else if (o.shape === "rect") {
          ctx.strokeRect(
            Math.min(x1, x2),
            Math.min(y1, y2),
            Math.abs(x2 - x1),
            Math.abs(y2 - y1)
          );
        } else if (o.shape === "ellipse") {
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const rx = Math.abs(x2 - x1) / 2;
          const ry = Math.abs(y2 - y1) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx || 0.1, ry || 0.1, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (o.type === "sticky") {
        ctx.fillStyle = o.color || "#fef08a";
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#334155";
        ctx.font = "14px Inter, sans-serif";
        ctx.fillText(o.text || "Note", o.x + 12, o.y + 28);
      } else if (o.type === "text") {
        ctx.fillStyle = o.color || "#0f172a";
        ctx.font = `${o.size || 18}px Inter, sans-serif`;
        ctx.fillText(o.text, o.x, o.y);
      } else if (o.type === "image" && o._img) {
        ctx.drawImage(o._img, o.x, o.y, o.w, o.h);
      } else if (o.type === "image" && o.src) {
        const img = new Image();
        img.onload = () => {
          o._img = img;
          this.render();
        };
        img.src = o.src;
      }
      ctx.restore();
    }

    _drawSelection(ctx, o) {
      ctx.save();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5 / this.scale;
      ctx.setLineDash([4 / this.scale, 4 / this.scale]);
      let x, y, w, h;
      if (o.type === "sticky" || o.type === "image") {
        x = o.x; y = o.y; w = o.w; h = o.h;
      } else if (o.type === "text") {
        x = o.x; y = o.y - (o.size || 18); w = 160; h = (o.size || 18) + 8;
      } else if (o.type === "shape") {
        x = Math.min(o.x1, o.x2); y = Math.min(o.y1, o.y2);
        w = Math.abs(o.x2 - o.x1); h = Math.abs(o.y2 - o.y1);
      } else {
        ctx.restore();
        return;
      }
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
      ctx.restore();
    }

    exportPNG() {
      // render flat export at current view
      const link = document.createElement("a");
      link.download = `sc-whiteboard-page-${this.pageIndex + 1}.png`;
      link.href = this.canvas.toDataURL("image/png");
      link.click();
    }

    save() {
      try {
        const data = {
          pages: this.pages.map((p) => ({
            id: p.id,
            background: p.background,
            objects: p.objects.map((o) => {
              if (o.type === "image") {
                const { _img, ...rest } = o;
                return rest;
              }
              return o;
            }),
          })),
          pageIndex: this.pageIndex,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* quota */
      }
    }

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.pages?.length) {
          this.pages = data.pages;
          this.pageIndex = Math.min(data.pageIndex || 0, this.pages.length - 1);
          this.background = this.page.background || "plain";
          this.render();
        }
      } catch {
        /* ignore */
      }
    }
  }

  global.BoardEngine = BoardEngine;
})(window);
