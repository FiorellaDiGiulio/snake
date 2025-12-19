import { Snake } from "./snake.js";
import { Food } from "./food.js";
import { mpapi } from "./mpapi.js";
import { Scoreboard } from "./scoreboard.js";

/* ===============================
   MULTIPLAYER API
================================ */
const api = new mpapi("wss://mpapi.se/net", "hungrig-orm");

let isHost = false;
let myId = null;
let gameStarted = false;

/* ===============================
   CANVAS
================================ */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CELL = 20;
const TICK_RATE = 120;

canvas.width = CELL * 40;
canvas.height = CELL * 25;

/* ===============================
   UI
================================ */
const uiOverlay = document.getElementById("uiOverlay");
const startScreen = document.getElementById("startScreen");

const startBtn = document.getElementById("startBtn");
const hostBtn = document.getElementById("hostBtn");
const joinBtn = document.getElementById("joinBtn");
const joinCodeInput = document.getElementById("joinCodeInput");

/* ===============================
   SCOREBOARD
================================ */
const scoreboard = new Scoreboard(
  document.getElementById("scoreboard")
);

/* ===============================
   GAME STATE
================================ */
let snakes = {};          // id → Snake
let food = null;
let inputs = {};          // id → direction
let lastTick = 0;

/* ===============================
   HOST
================================ */
async function startHost() {
  const { session, clientId } = await api.host();
  myId = clientId;
  isHost = true;

  alert("Session ID: " + session);

  snakes = {};
  inputs = {};
  scoreboard.reset();

  snakes[myId] = new Snake(canvas);
  food = new Food(canvas, snakes[myId]);

  scoreboard.ensurePlayer(myId);
  scoreboard.render(myId);

  listenMultiplayer();
  hideUI();
}

/* ===============================
   JOIN
================================ */
async function joinMultiplayer() {
  const code = joinCodeInput.value.trim();
  if (!code) return alert("Skriv in session ID");

  const res = await api.join(code);
  myId = res.clientId;
  isHost = false;

  scoreboard.reset();
  listenMultiplayer();
  hideUI();
}

/* ===============================
   MP LISTENER
================================ */
function listenMultiplayer() {
  api.listen((event, _, clientId, data) => {

    /* CLIENT: ta emot state */
    if (!isHost && event === "game")
 {
      rebuildState(data);

      if (!gameStarted) {
        gameStarted = true;
        requestAnimationFrame(gameLoop);
      }
    }

    /* HOST: input från klient */
    if (isHost && event === "game" && data.type === "input") {
      inputs[clientId] = data.direction;
    }

    /* HOST: ny spelare */
    if (isHost && event === "joined") {
      snakes[clientId] = new Snake(canvas);
      scoreboard.ensurePlayer(clientId);
      scoreboard.render(myId);
    }
  });
}

/* ===============================
   GAME LOOP
================================ */
function gameLoop(ts) {
  if (ts - lastTick > TICK_RATE) {
    if (isHost) updateHost();
    lastTick = ts;
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

/* ===============================
   HOST UPDATE (ENDA LOGIKEN)
================================ */
function updateHost() {
  for (const id in snakes) {
    const s = snakes[id];
    if (inputs[id]) s.direction = inputs[id];
    s.update();
  }

  for (const id in snakes) {
    const s = snakes[id];
    if (
      s.head.x === food.position.x &&
      s.head.y === food.position.y
    ) {
      s.grow();
      food.respawn(s);
      scoreboard.addPoint(id);
    }
  }

  api.transmit({
    type: "state",
    snakes: serializeSnakes(),
    food: food.position,
    scores: scoreboard.scores
  });

  scoreboard.render(myId);
}

/* ===============================
   CLIENT: BYGG STATE
================================ */
function rebuildState(data) {
  snakes = {};
  for (const id in data.snakes) {
    const s = new Snake(canvas);
    s.body = data.snakes[id].body;
    s.direction = data.snakes[id].direction;
    snakes[id] = s;
  }

  if (!food && snakes[myId]) {
    food = new Food(canvas, snakes[myId]);
  }

  food.position = data.food;
  scoreboard.scores = data.scores;
  scoreboard.render(myId);
}

/* ===============================
   HELPERS
================================ */
function serializeSnakes() {
  return Object.fromEntries(
    Object.entries(snakes).map(([id, s]) => [
      id,
      { body: s.body, direction: s.direction }
    ])
  );
}

/* ===============================
   RENDER (STYLE OBERÖRD)
================================ */
function renderGame() {
  drawGrid();
  if (food) food.draw(ctx);

  for (const id in snakes) {
    drawSnakeWithColor(snakes[id], id);
  }
}

function drawSnakeWithColor(snake, id) {
  ctx.save();
  const hue = scoreboard._hueFromId(id);
  ctx.filter = `hue-rotate(${hue}deg)`;
  snake.draw(ctx);
  ctx.restore();
}

function drawGrid() {
  for (let x = 0; x < canvas.width / CELL; x++) {
    for (let y = 0; y < canvas.height / CELL; y++) {
      ctx.fillStyle =
        (x + y) % 2 === 0 ? "#141a21" : "#10151b";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

/* ===============================
   INPUT (CLIENT → HOST)
================================ */
document.addEventListener("keydown", (e) => {
  if (!gameStarted || isHost) return;

  const dir =
    e.key === "ArrowUp" ? { x: 0, y: -1 } :
    e.key === "ArrowDown" ? { x: 0, y: 1 } :
    e.key === "ArrowLeft" ? { x: -1, y: 0 } :
    e.key === "ArrowRight" ? { x: 1, y: 0 } :
    null;

  if (dir) {
    api.transmit({ type: "input", direction: dir });
  }
});

/* ===============================
   UI
================================ */
function hideUI() {
  uiOverlay.classList.add("hidden");
  startScreen.classList.add("hidden");
}

startBtn.onclick = () => alert("Singleplayer kvar senare 😉");
hostBtn.onclick = startHost;
joinBtn.onclick = joinMultiplayer;
