/**
 * SC Whiteboard — UI (advanced teaching tools)
 */
(function (global) {
  const PERIODIC = ["H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Fe","Cu","Zn","Br","Ag","Au"];
  const MATH_FORMULAS = ["a² + b² = c²","(a+b)² = a²+2ab+b²","x = (-b±√(b²-4ac))/2a","A = πr²","sin²θ + cos²θ = 1","E = mc²"];
  const PHYS = ["F = ma","V = IR","P = IV","λ = v/f","KE = ½mv²"];

  function bindUI(engine) {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const toolButtons = $$(".tool[data-tool]");
    const colorPicker = $("#color-picker");
    const sizeSlider = $("#size-slider");
    const opacitySlider = $("#opacity-slider");
    const fillToggle = $("#fill-toggle");
    const pageList = $("#page-list");
    const statusTool = $("#status-tool");
    const statusZoom = $("#status-zoom");
    const statusPage = $("#status-page");
    const laserDot = $("#laser-dot");
    const spotlight = $("#spotlight");
    const curtain = $("#curtain");
    const curtainBar = $("#curtain-bar");
    const magnifier = $("#magnifier");
    const timerWidget = $("#timer-widget");
    const timerDisplay = $("#timer-display");
    const clockWidget = $("#clock-widget");
    const clockDisplay = $("#clock-display");
    const subjectPanel = $("#subject-panel");
    const app = $("#app");
    const stage = $("#stage");

    const toolNames = {
      select:"Select", pen:"Pen", brush:"Brush", highlighter:"Highlighter", eraser:"Eraser",
      laser:"Laser", line:"Line", rect:"Rectangle", ellipse:"Ellipse", triangle:"Triangle",
      arrow:"Arrow", text:"Text", sticky:"Sticky"
    };

    let timerSeconds = 300, timerInterval = null, clockInterval = null, curtainY = 0.45;

    function refreshTools() {
      toolButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tool === engine.tool));
      statusTool.textContent = toolNames[engine.tool] || engine.tool;
    }
    function refreshPages() {
      pageList.innerHTML = "";
      engine.pages.forEach((p, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "page-item" + (i === engine.pageIndex ? " active" : "");
        el.innerHTML = `<span class="page-thumb"></span><span>Page ${i + 1}</span>`;
        el.addEventListener("click", () => { engine.gotoPage(i); refreshPages(); refreshBg(); updateStatus(); });
        pageList.appendChild(el);
      });
      statusPage.textContent = `Page ${engine.pageIndex + 1} / ${engine.pages.length}`;
    }
    function refreshBg() {
      $$(".bg-swatch").forEach((s) => s.classList.toggle("active", s.dataset.bg === (engine.page.background || "plain")));
    }
    function updateStatus() {
      statusZoom.textContent = Math.round(engine.scale * 100) + "%";
      statusPage.textContent = `Page ${engine.pageIndex + 1} / ${engine.pages.length}`;
      statusTool.textContent = toolNames[engine.tool] || engine.tool;
    }

    engine.onChange = () => { refreshPages(); updateStatus(); refreshBg(); };
    engine.onLaser = (sx, sy) => {
      if (sx == null) { laserDot.hidden = true; return; }
      laserDot.hidden = false; laserDot.style.left = sx + "px"; laserDot.style.top = sy + "px";
    };
    engine.onMagnifier = (sx, sy) => {
      if (!engine.magnifier || !magnifier) return;
      magnifier.hidden = false;
      magnifier.style.left = (sx - 60) + "px";
      magnifier.style.top = (sy - 60) + "px";
    };

    toolButtons.forEach((btn) => btn.addEventListener("click", () => { engine.setTool(btn.dataset.tool); refreshTools(); }));
    if (colorPicker) colorPicker.addEventListener("input", () => engine.setColor(colorPicker.value));
    if (sizeSlider) sizeSlider.addEventListener("input", () => engine.setSize(Number(sizeSlider.value)));
    if (opacitySlider) opacitySlider.addEventListener("input", () => engine.setOpacity(Number(opacitySlider.value) / 100));
    if (fillToggle) fillToggle.addEventListener("change", () => engine.setFill(fillToggle.checked));
    $$("#color-presets button").forEach((b) => b.addEventListener("click", () => {
      engine.setColor(b.dataset.c);
      if (colorPicker && b.dataset.c.length === 7) colorPicker.value = b.dataset.c;
    }));

    $("#btn-undo")?.addEventListener("click", () => engine.undo());
    $("#btn-redo")?.addEventListener("click", () => engine.redo());
    $("#btn-export")?.addEventListener("click", () => engine.exportPNG());
    $("#btn-export-json")?.addEventListener("click", () => engine.exportJSON());
    $("#btn-add-page")?.addEventListener("click", () => { engine.addPage(); refreshPages(); });
    $("#btn-dup-page")?.addEventListener("click", () => { engine.duplicatePage(); refreshPages(); });
    $("#btn-del-page")?.addEventListener("click", () => { engine.deletePage(); refreshPages(); });
    $("#btn-clear")?.addEventListener("click", () => { if (confirm("Clear current page?")) engine.clearPage(); });
    $("#btn-theme")?.addEventListener("click", () => {
      const next = app.dataset.theme === "dark" ? "light" : "dark";
      app.dataset.theme = next; localStorage.setItem("sc-wb-theme", next);
    });
    const savedTheme = localStorage.getItem("sc-wb-theme");
    if (savedTheme) app.dataset.theme = savedTheme;
    $("#btn-fullscreen")?.addEventListener("click", () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
    $("#btn-spotlight")?.addEventListener("click", () => {
      engine.spotlight = !engine.spotlight;
      if (spotlight) spotlight.hidden = !engine.spotlight;
      $("#btn-spotlight").textContent = engine.spotlight ? "Spotlight on" : "Spotlight";
    });

    function setCurtain(y) {
      curtainY = Math.max(0.05, Math.min(0.95, y));
      if (curtain) curtain.style.setProperty("--cy", curtainY * 100 + "%");
    }
    $("#btn-curtain")?.addEventListener("click", () => {
      if (!curtain) return;
      const on = curtain.hidden;
      curtain.hidden = !on;
      if (on) setCurtain(curtainY);
      $("#btn-curtain").textContent = on ? "Curtain on" : "Screen curtain";
    });
    let draggingCurtain = false;
    curtainBar?.addEventListener("pointerdown", (e) => { draggingCurtain = true; curtainBar.setPointerCapture(e.pointerId); });
    curtainBar?.addEventListener("pointermove", (e) => {
      if (!draggingCurtain || !stage) return;
      const rect = stage.getBoundingClientRect();
      setCurtain((e.clientY - rect.top) / rect.height);
    });
    curtainBar?.addEventListener("pointerup", () => { draggingCurtain = false; });

    $("#btn-magnifier")?.addEventListener("click", () => {
      engine.magnifier = !engine.magnifier;
      if (magnifier) magnifier.hidden = !engine.magnifier;
      $("#btn-magnifier").textContent = engine.magnifier ? "Magnifier on" : "Magnifier";
    });

    function fmt(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
    function renderTimer() { if (timerDisplay) timerDisplay.textContent = fmt(timerSeconds); }
    $("#btn-timer")?.addEventListener("click", () => { if (timerWidget) timerWidget.hidden = !timerWidget.hidden; });
    $("#timer-start")?.addEventListener("click", () => {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; $("#timer-start").textContent = "Start"; return; }
      $("#timer-start").textContent = "Pause";
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) { timerSeconds--; renderTimer(); }
        else { clearInterval(timerInterval); timerInterval = null; $("#timer-start").textContent = "Start"; if (timerDisplay) timerDisplay.style.color = "#f43f5e"; }
      }, 1000);
    });
    $("#timer-reset")?.addEventListener("click", () => { timerSeconds = 300; if (timerDisplay) timerDisplay.style.color = ""; renderTimer(); });
    $("#timer-close")?.addEventListener("click", () => { if (timerWidget) timerWidget.hidden = true; });
    renderTimer();

    function tickClock() { if (clockDisplay) clockDisplay.textContent = new Date().toLocaleTimeString(); }
    $("#btn-clock")?.addEventListener("click", () => {
      if (!clockWidget) return;
      clockWidget.hidden = !clockWidget.hidden;
      if (!clockWidget.hidden) { tickClock(); if (!clockInterval) clockInterval = setInterval(tickClock, 1000); }
    });
    $("#clock-close")?.addEventListener("click", () => {
      if (clockWidget) clockWidget.hidden = true;
      if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    });

    function showSubject(kind) {
      if (!subjectPanel) return;
      subjectPanel.innerHTML = "";
      if (kind === "chem") {
        const grid = document.createElement("div"); grid.className = "chem-grid";
        PERIODIC.forEach((el) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "chem-el"; b.textContent = el;
          b.addEventListener("click", () => engine.insertTextAt(100 + Math.random() * 80, 100 + Math.random() * 80, el, 28));
          grid.appendChild(b);
        });
        subjectPanel.appendChild(grid);
      } else if (kind === "math") {
        MATH_FORMULAS.forEach((f) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "btn small block"; b.textContent = f;
          b.addEventListener("click", () => engine.insertTextAt(80, 120 + Math.random() * 40, f, 22));
          subjectPanel.appendChild(b);
        });
      } else if (kind === "phys") {
        PHYS.forEach((f) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "btn small block"; b.textContent = f;
          b.addEventListener("click", () => engine.insertTextAt(80, 120, f, 22));
          subjectPanel.appendChild(b);
        });
      } else {
        const b = document.createElement("button"); b.type = "button"; b.className = "btn small block";
        b.textContent = "Use ruled English lines";
        b.addEventListener("click", () => { engine.setBackground("ruled"); refreshBg(); });
        subjectPanel.appendChild(b);
      }
    }
    $$("[data-subject]").forEach((btn) => btn.addEventListener("click", () => showSubject(btn.dataset.subject)));
    showSubject("chem");

    $$(".bg-swatch").forEach((s) => s.addEventListener("click", () => { engine.setBackground(s.dataset.bg); refreshBg(); }));

    const fileInput = $("#file-image");
    $("#btn-image")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { const img = new Image(); img.onload = () => engine.addImage(img); img.src = reader.result; };
      reader.readAsDataURL(file); fileInput.value = "";
    });
    stage?.addEventListener("dragover", (e) => e.preventDefault());
    stage?.addEventListener("drop", (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0]; if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const rect = stage.getBoundingClientRect();
          const p = engine.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
          engine.addImage(img, p.x, p.y);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    const canvas = engine.canvas;
    let activePointer = null;
    canvas.addEventListener("pointerdown", (e) => {
      if (activePointer != null) return;
      activePointer = e.pointerId; canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (engine.spotlight && spotlight) { spotlight.style.setProperty("--sx", x + "px"); spotlight.style.setProperty("--sy", y + "px"); }
      engine.pointerDown(x, y, e.shiftKey); refreshTools();
    });
    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (activePointer !== e.pointerId) { if (engine.magnifier) engine.onMagnifier?.(x, y); return; }
      if (engine.spotlight && spotlight) { spotlight.style.setProperty("--sx", x + "px"); spotlight.style.setProperty("--sy", y + "px"); }
      engine.pointerMove(x, y, e.shiftKey);
    });
    function endPointer(e) { if (activePointer !== e.pointerId) return; activePointer = null; engine.pointerUp(); }
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      engine.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
      updateStatus();
    }, { passive: false });

    window.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey; const k = e.key.toLowerCase();
      if (e.code === "Space") { engine.spaceDown = true; canvas.style.cursor = "grab"; e.preventDefault(); }
      if (mod && k === "z" && !e.shiftKey) { e.preventDefault(); engine.undo(); }
      else if (mod && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); engine.redo(); }
      else if (mod && k === "s") { e.preventDefault(); engine.exportPNG(); }
      else if (k === "v") engine.setTool("select");
      else if (k === "p") engine.setTool("pen");
      else if (k === "h") engine.setTool("highlighter");
      else if (k === "e") engine.setTool("eraser");
      else if (k === "f") $("#btn-fullscreen")?.click();
      else if (k === "t") $("#btn-timer")?.click();
      else if (k === "c" && !mod) $("#btn-curtain")?.click();
      else if ((k === "delete" || k === "backspace") && engine.selection) { e.preventDefault(); engine.deleteSelection(); }
      else if (k === "[" && sizeSlider) { engine.setSize(Math.max(1, engine.size - 1)); sizeSlider.value = engine.size; }
      else if (k === "]" && sizeSlider) { engine.setSize(Math.min(48, engine.size + 1)); sizeSlider.value = engine.size; }
      refreshTools(); updateStatus();
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") { engine.spaceDown = false; canvas.style.cursor = ""; }
    });

    refreshTools(); refreshPages(); refreshBg(); updateStatus();
  }
  global.bindUI = bindUI;
})(window);
