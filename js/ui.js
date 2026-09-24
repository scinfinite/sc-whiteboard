/**
 * SC Whiteboard — UI bindings, shortcuts, panels
 */
(function (global) {
  function bindUI(engine) {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => [...document.querySelectorAll(sel)];

    const toolButtons = $$(".tool[data-tool]");
    const colorPicker = $("#color-picker");
    const sizeSlider = $("#size-slider");
    const opacitySlider = $("#opacity-slider");
    const pageList = $("#page-list");
    const statusTool = $("#status-tool");
    const statusZoom = $("#status-zoom");
    const statusPage = $("#status-page");
    const laserDot = $("#laser-dot");
    const spotlight = $("#spotlight");
    const app = $("#app");

    const toolNames = {
      select: "Select",
      pen: "Pen",
      highlighter: "Highlighter",
      eraser: "Eraser",
      laser: "Laser",
      line: "Line",
      rect: "Rectangle",
      ellipse: "Ellipse",
      arrow: "Arrow",
      text: "Text",
      sticky: "Sticky note",
    };

    function refreshTools() {
      toolButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tool === engine.tool);
      });
      statusTool.textContent = toolNames[engine.tool] || engine.tool;
    }

    function refreshPages() {
      pageList.innerHTML = "";
      engine.pages.forEach((p, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "page-item" + (i === engine.pageIndex ? " active" : "");
        el.innerHTML = `<span class="page-thumb"></span><span>Page ${i + 1}</span>`;
        el.addEventListener("click", () => {
          engine.gotoPage(i);
          refreshPages();
          refreshBg();
          updateStatus();
        });
        pageList.appendChild(el);
      });
      statusPage.textContent = `Page ${engine.pageIndex + 1} / ${engine.pages.length}`;
    }

    function refreshBg() {
      $$(".bg-swatch").forEach((s) => {
        s.classList.toggle("active", s.dataset.bg === (engine.page.background || "plain"));
      });
    }

    function updateStatus() {
      statusZoom.textContent = Math.round(engine.scale * 100) + "%";
      statusPage.textContent = `Page ${engine.pageIndex + 1} / ${engine.pages.length}`;
      statusTool.textContent = toolNames[engine.tool] || engine.tool;
    }

    engine.onChange = () => {
      refreshPages();
      updateStatus();
      refreshBg();
    };

    engine.onLaser = (sx, sy) => {
      if (sx == null) {
        laserDot.hidden = true;
        return;
      }
      laserDot.hidden = false;
      laserDot.style.left = sx + "px";
      laserDot.style.top = sy + "px";
    };

    toolButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        engine.setTool(btn.dataset.tool);
        refreshTools();
      });
    });

    colorPicker.addEventListener("input", () => engine.setColor(colorPicker.value));
    sizeSlider.addEventListener("input", () => engine.setSize(Number(sizeSlider.value)));
    opacitySlider.addEventListener("input", () =>
      engine.setOpacity(Number(opacitySlider.value) / 100)
    );

    $("#btn-undo").addEventListener("click", () => engine.undo());
    $("#btn-redo").addEventListener("click", () => engine.redo());
    $("#btn-export").addEventListener("click", () => engine.exportPNG());
    $("#btn-add-page").addEventListener("click", () => {
      engine.addPage();
      refreshPages();
    });
    $("#btn-dup-page").addEventListener("click", () => {
      engine.duplicatePage();
      refreshPages();
    });
    $("#btn-clear").addEventListener("click", () => {
      if (confirm("Clear current page?")) engine.clearPage();
    });

    $("#btn-theme").addEventListener("click", () => {
      const next = app.dataset.theme === "dark" ? "light" : "dark";
      app.dataset.theme = next;
      localStorage.setItem("sc-wb-theme", next);
    });

    const savedTheme = localStorage.getItem("sc-wb-theme");
    if (savedTheme) app.dataset.theme = savedTheme;

    $("#btn-fullscreen").addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    $("#btn-spotlight").addEventListener("click", () => {
      engine.spotlight = !engine.spotlight;
      spotlight.hidden = !engine.spotlight;
      $("#btn-spotlight").textContent = engine.spotlight ? "Spotlight on" : "Spotlight";
    });

    $$(".bg-swatch").forEach((s) => {
      s.addEventListener("click", () => {
        engine.setBackground(s.dataset.bg);
        refreshBg();
      });
    });

    // Image insert
    const fileInput = $("#file-image");
    $("#btn-image").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => engine.addImage(img);
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
      fileInput.value = "";
    });

    // Drag & drop images
    const stage = $("#stage");
    stage.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    stage.addEventListener("drop", (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
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

    // Pointer events on canvas
    const canvas = engine.canvas;
    let activePointer = null;

    canvas.addEventListener("pointerdown", (e) => {
      if (activePointer != null) return;
      activePointer = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (engine.spotlight) {
        spotlight.style.setProperty("--sx", x + "px");
        spotlight.style.setProperty("--sy", y + "px");
      }
      engine.pointerDown(x, y, e.shiftKey);
      refreshTools();
    });

    canvas.addEventListener("pointermove", (e) => {
      if (activePointer !== e.pointerId) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (engine.spotlight) {
        spotlight.style.setProperty("--sx", x + "px");
        spotlight.style.setProperty("--sy", y + "px");
      }
      engine.pointerMove(x, y, e.shiftKey);
    });

    function endPointer(e) {
      if (activePointer !== e.pointerId) return;
      activePointer = null;
      engine.pointerUp();
    }
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);

    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        engine.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY);
        updateStatus();
      },
      { passive: false }
    );

    // Keyboard
    window.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      if (e.code === "Space") {
        engine.spaceDown = true;
        canvas.style.cursor = "grab";
        e.preventDefault();
      }

      if (mod && k === "z" && !e.shiftKey) {
        e.preventDefault();
        engine.undo();
      } else if (mod && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        engine.redo();
      } else if (mod && k === "s") {
        e.preventDefault();
        engine.exportPNG();
      } else if (k === "v") engine.setTool("select");
      else if (k === "p") engine.setTool("pen");
      else if (k === "h") engine.setTool("highlighter");
      else if (k === "e") engine.setTool("eraser");
      else if (k === "f") $("#btn-fullscreen").click();
      else if (k === "delete" || k === "backspace") {
        if (engine.selection) {
          e.preventDefault();
          engine.deleteSelection();
        }
      } else if (k === "[" ) {
        engine.setSize(Math.max(1, engine.size - 1));
        sizeSlider.value = engine.size;
      } else if (k === "]") {
        engine.setSize(Math.min(48, engine.size + 1));
        sizeSlider.value = engine.size;
      }

      refreshTools();
      updateStatus();
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        engine.spaceDown = false;
        canvas.style.cursor = "";
      }
    });

    // Initial
    refreshTools();
    refreshPages();
    refreshBg();
    updateStatus();
  }

  global.bindUI = bindUI;
})(window);
