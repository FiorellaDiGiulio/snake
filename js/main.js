import { Snake } from "./snake.js";
import { Food } from "./food.js";
import { mpapi } from "./mpapi.js";
import { Scoreboard } from "./scoreboard.js";

/* ===============================
   MULTIPLAYER API
================================ */
const api = new mpapi("wss://mpapi.se/net", "hungrig-orm");

let isMultiplayer = false;
let isHost = false;
let myId = null;

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
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
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
let snakes = {};        // id -> Snake
let food = null;
let lastTick = 0;

/* ===============================
   SINGLEPLAYER
================================ */
function startSingleplayer() {
  isMultiplayer = false;
  isHost = false;

  snakes = {};
  scoreboard.reset();

  myId = "local";
  snakes[myId] = new Snake(canvas);
  food = new Food(canvas, snakes[myId]);

  scoreboard.ensurePlayer(myId);
  scoreboard.render(myId);

  hideUI();
  lastTick = 0;
  requestAnimationFrame(gameLoop);
}

/* ===============================
   HOST MULTIPLAYER
================================ */
async function startHost() {
  try {
    isMultiplayer = true;
    isHost = true;

    const { session, clientId } = await api.host();
    myId = clientId;

    alert("Session ID: " + session);

    snakes = {};
    scoreboard.reset();

    snakes[myId] = new Snake(canvas);
    food = new Food(canvas, snakes[myId]);

    scoreboard.ensurePlayer(myId);
    scoreboard.render(myId);

    listenMultiplayer();

    hideUI();
    lastTick = 0;
    requestAnimationFrame(gameLoop);

  } catch (e) {
    console.error(e);
    alert("Kunde inte hosta");
  }
}

/* ===============================
   JOIN MULTIPLAYER
================================ */
async function joinMultiplayer() {
  const code = joinCodeInput.value.trim();
  if (!code) {
    alert("Skriv in session-ID");
    return;
  }

  try {
    isMultiplayer = true;
    isHost = false;

    const { clientId } = await api.join(code);
    myId = clientId;

    snakes = {};
    scoreboard.reset();

    snakes[myId] = new Snake(canvas);
    food = new Food(canvas, snakes[myId]);

    scoreboard.ensurePlayer(myId);
    scoreboard.render(myId);

    listenMultiplayer();

    hideUI();
    lastTick = 0;
    requestAnimationFrame(gameLoop);

  } catch (e) {
    console.error(e);
    alert("Kunde inte ansluta");
  }
}

/* ===============================
   MULTIPLAYER LISTENER
================================ */
function listenMultiplayer() {
  api.listen((event, _, clientId, data) => {
    if (event !== "game") return;

    // Bygg state från host
    snakes = {};

    for (const id in data.snakes) {
      const s = new Snake(canvas);
      s.body = data.snakes[id].body;
      s.direction = data.snakes[id].direction;
      snakes[id] = s;

      scoreboard.ensurePlayer(id);
    }

    if (!food && snakes[myId]) {
      food = new Food(canvas, snakes[myId]);
    }

    food.position = data.food;
    scoreboard.render(myId);
  });
}

/* ===============================
   GAME LOOP
================================ */
function gameLoop(ts) {
  if (ts - lastTick > TICK_RATE) {
    updateGame();
    lastTick = ts;
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

/* ===============================
   UPDATE
================================ */
function updateGame() {
  const me = snakes[myId];
  if (!me || !food) return;

  me.update();

  // äta mat
  if (me.head.x === food.position.x &&
      me.head.y === food.position.y) {
    me.grow();
    food.respawn(me);

    scoreboard.addPoint(myId);
    scoreboard.render(myId);
  }

  // HOST skickar state
  if (isMultiplayer && isHost) {
    api.transmit({
      snakes: Object.fromEntries(
        Object.entries(snakes).map(([id, s]) => [
          id,
          { body: s.body, direction: s.direction }
        ])
      ),
      food: food.position
    });
  }
}

/* ===============================
   RENDER
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

/* ===============================
   GRID
================================ */
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
   INPUT
================================ */
document.addEventListener("keydown", (e) => {
  if (!snakes[myId]) return;

  const dir =
    e.key === "ArrowUp"    ? { x: 0, y: -1 } :
    e.key === "ArrowDown"  ? { x: 0, y: 1 } :
    e.key === "ArrowLeft"  ? { x: -1, y: 0 } :
    e.key === "ArrowRight" ? { x: 1, y: 0 } :
    null;

  if (!dir) return;

  snakes[myId].direction = dir;

  if (isMultiplayer && !isHost) {
    api.transmit({ input: dir });
  }
});

/* ===============================
   UI
================================ */
function hideUI() {
  uiOverlay.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

startBtn.onclick = startSingleplayer;
restartBtn.onclick = startSingleplayer;
hostBtn.onclick = startHost;
joinBtn.onclick = joinMultiplayer;
