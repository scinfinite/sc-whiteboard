/**
 * SC Whiteboard — advanced engine extensions
 * Loaded after engine.js
 */
(function () {
  if (typeof BoardEngine === "undefined") return;
  const P = BoardEngine.prototype;

  P.setFill = function (v) { this.fillShapes = !!v; };

  P.deletePage = function () {
    if (this.pages.length <= 1) return;
    this.pushHistory();
    this.pages.splice(this.pageIndex, 1);
    if (this.pageIndex >= this.pages.length) this.pageIndex = this.pages.length - 1;
    this.selection = null;
    this.background = this.page.background || "plain";
    this.render();
    this.onChange?.();
  };

  P.insertTextAt = function (x, y, text, size) {
    this.pushHistory();
    this.page.objects.push({
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      type: "text", x, y, text, color: this.color, size: size || 20,
    });
    this.render(); this.onChange?.(); this.save();
  };

  P.exportJSON = function () {
    const data = {
      version: 2,
      pages: this.pages.map((p) => ({
        id: p.id, background: p.background,
        objects: p.objects.map((o) => {
          if (o.type === "image") { const { _img, ...rest } = o; return rest; }
          return o;
        }),
      })),
      pageIndex: this.pageIndex,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sc-whiteboard-project.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const origDown = P.pointerDown;
  P.pointerDown = function (sx, sy, shiftKey) {
    if (this.spaceDown) { this.panning = true; this.lastPan = { x: sx, y: sy }; return; }
    const p = this.screenToWorld(sx, sy);
    if (this.tool === "select") {
      this.selection = this.hitTest(p.x, p.y);
      this.drawing = !!this.selection;
      this._dragStart = p;
      this._selStart = this.selection ? JSON.parse(JSON.stringify(this.selection)) : null;
      this.render(); return;
    }
    if (this.tool === "laser") { this.drawing = true; return; }

    if (["pen", "brush", "highlighter", "eraser"].includes(this.tool)) {
      this.pushHistory(); this.drawing = true;
      const isBrush = this.tool === "brush";
      this.currentStroke = {
        id: Math.random().toString(36).slice(2, 10),
        type: "stroke", tool: this.tool,
        color: this.tool === "eraser" ? "#000" : this.color,
        size: this.tool === "highlighter" ? this.size * 3 : isBrush ? this.size * 1.8 : this.size,
        opacity: this.tool === "highlighter" ? 0.35 : isBrush ? Math.min(0.85, this.opacity) : this.tool === "eraser" ? 1 : this.opacity,
        points: [p], erase: this.tool === "eraser", soft: isBrush,
      };
      this.page.objects.push(this.currentStroke);
      this.render(); return;
    }
    if (["line", "rect", "ellipse", "arrow", "triangle"].includes(this.tool)) {
      this.pushHistory(); this.drawing = true;
      this.currentStroke = {
        id: Math.random().toString(36).slice(2, 10),
        type: "shape", shape: this.tool, color: this.color, size: this.size,
        opacity: this.opacity, fill: !!this.fillShapes,
        x1: p.x, y1: p.y, x2: p.x, y2: p.y, shift: shiftKey,
      };
      this.page.objects.push(this.currentStroke);
      this.render(); return;
    }
    return origDown.call(this, sx, sy, shiftKey);
  };

  const origDraw = P._drawObject;
  P._drawObject = function (ctx, o) {
    if (o.type === "stroke" && o.soft && !o.erase) {
      ctx.save();
      const pts = o.points;
      if (!pts || !pts.length) { ctx.restore(); return; }
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = o.size;
      ctx.globalAlpha = o.opacity ?? 1; ctx.strokeStyle = o.color;
      ctx.shadowBlur = o.size * 0.6; ctx.shadowColor = o.color;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke(); ctx.shadowBlur = 0; ctx.restore(); return;
    }
    if (o.type === "shape" && o.shape === "triangle") {
      ctx.save();
      ctx.strokeStyle = o.color; ctx.fillStyle = o.color; ctx.lineWidth = o.size;
      ctx.globalAlpha = o.opacity ?? 1; ctx.lineCap = "round";
      let x1 = o.x1, y1 = o.y1, x2 = o.x2, y2 = o.y2;
      if (o.shift) {
        const s = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        x2 = x1 + Math.sign(x2 - x1 || 1) * s; y2 = y1 + Math.sign(y2 - y1 || 1) * s;
      }
      const midX = (x1 + x2) / 2;
      ctx.beginPath(); ctx.moveTo(midX, y1); ctx.lineTo(x1, y2); ctx.lineTo(x2, y2); ctx.closePath();
      if (o.fill) { ctx.globalAlpha = (o.opacity ?? 1) * 0.25; ctx.fill(); ctx.globalAlpha = o.opacity ?? 1; }
      ctx.stroke(); ctx.restore(); return;
    }
    if (o.type === "shape" && o.fill && (o.shape === "rect" || o.shape === "ellipse")) {
      ctx.save();
      ctx.strokeStyle = o.color; ctx.fillStyle = o.color; ctx.lineWidth = o.size;
      ctx.globalAlpha = o.opacity ?? 1;
      let x1 = o.x1, y1 = o.y1, x2 = o.x2, y2 = o.y2;
      if (o.shift) {
        const s = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        x2 = x1 + Math.sign(x2 - x1 || 1) * s; y2 = y1 + Math.sign(y2 - y1 || 1) * s;
      }
      if (o.shape === "rect") {
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
        ctx.globalAlpha = (o.opacity ?? 1) * 0.25; ctx.fillRect(rx, ry, rw, rh);
        ctx.globalAlpha = o.opacity ?? 1; ctx.strokeRect(rx, ry, rw, rh);
      } else {
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx || 0.1, ry || 0.1, 0, 0, Math.PI * 2);
        ctx.globalAlpha = (o.opacity ?? 1) * 0.25; ctx.fill();
        ctx.globalAlpha = o.opacity ?? 1; ctx.stroke();
      }
      ctx.restore(); return;
    }
    return origDraw.call(this, ctx, o);
  };
})();
