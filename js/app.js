/**
 * SC Whiteboard — bootstrap
 */
(function () {
  const canvas = document.getElementById("board");
  if (!canvas || typeof BoardEngine === "undefined") {
    console.error("SC Whiteboard: missing canvas or engine");
    return;
  }

  const engine = new BoardEngine(canvas);
  engine.load();
  bindUI(engine);

  // Welcome stroke hint on first visit
  if (!localStorage.getItem("sc-whiteboard-v1")) {
    engine.pushHistory();
    engine.page.objects.push({
      id: "welcome",
      type: "text",
      x: 80,
      y: 100,
      text: "Welcome to SC Whiteboard",
      color: "#3b82f6",
      size: 28,
    });
    engine.page.objects.push({
      id: "welcome2",
      type: "text",
      x: 80,
      y: 140,
      text: "Draw · Annotate · Present · Teach",
      color: "#64748b",
      size: 16,
    });
    engine.render();
    engine.save();
  }

  console.info("SC Whiteboard ready");
})();
