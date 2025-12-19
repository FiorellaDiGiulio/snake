import { Snake } from "./snake.js";
import { Food } from "./food.js";
import { mpapi } from "./mpapi.js";
import { Scoreboard } from "./scoreboard.js";

/* ===============================
   MULTIPLAYER API
================================ */
const api = new mpapi("wss://mpapi.se/net", "hungrig-orm");

/* ===============================
   GLOBAL STATE
================================ */
let isMultiplayer = false;
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
   UI ELEMENTS
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
   GAME DATA
================================ */
let snakes = {};
let food = null;
let inputs = {};
let lastTick = 0;

/* ===============================
   RESET MULTIPLAYER (🔥 VIKTIG)
================================ */
function resetMultiplayer() {
  try {
    api.leave();
  } catch {}
  isMultiplayer = false;
  isHost = false;
  myId = null;
  gameStarted = false;
  snakes = {};
  inputs = {};
  scoreboard.reset();
}

/* ===============================
   SINGLEPLAYER
================================ */
function startSingleplayer() {
  resetMultiplayer();

  myId = "local";
  snakes[myId] = new Snake(canvas);
  food = new Food(canvas, snakes[myId]);

  scoreboard.ensurePlayer(myId);
  scoreboard.render(myId);

  hideUI();
  lastTick = 0;
  gameStarted = true;
  requestAnimationFrame(gameLoop);
}

/* ===============================
   HOST MULTIPLAYER
================================ */
async function startHost() {
  resetMultiplayer();

  try {
    isMultiplayer = true;
    isHost = true;

    const { session, clientId } = await api.host();
    myId = clientId;

    alert("Session code: " + session);

    snakes[myId] = new Snake(canvas);
    food = new Food(canvas, snakes[myId]);

    scoreboard.ensurePlayer(myId);
    scoreboard.render(myId);

    listenMultiplayer();

    hideUI();
    gameStarted = true;
    requestAnimationFrame(gameLoop);
  } catch (e) {
    alert("Kunde inte hosta: " + e);
  }
}

/* ===============================
   JOIN MULTIPLAYER
================================ */
async function joinMultiplayer() {
  resetMultiplayer();

  const code = joinCodeInput.value.trim();
  if (!code) return alert("Skriv in sessionkod");

  try {
    isMultiplayer = true;
    isHost = false;

    const res = await api.join(code);
    myId = res.clientId;

    scoreboard.ensurePlayer(myId);
    scoreboard.render(myId);

    listenMultiplayer();
    hideUI();
  } catch (e) {
    alert("Kunde inte ansluta: " + e);
  }
}

/* ===============================
   MULTIPLAYER LISTENER
================================ */
function listenMultiplayer() {
  api.listen((event, _, clientId, data) => {

    // 🔹 Ny spelare
    if (event === "joined") {
      if (!snakes[clientId]) {
        snakes[clientId] = new Snake(canvas);
        scoreboard.ensurePlayer(clientId);
        scoreboard.render(myId);
      }
    }

    // 🔹 Speldata
    if (event === "game") {

      // INPUT → endast host tar emot
      if (isHost && data.input) {
        inputs[clientId] = data.input;
        return;
      }

      // STATE → endast klienter tar emot
      if (!isHost && data.snakes) {
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

        if (!gameStarted) {
          gameStarted = true;
          requestAnimationFrame(gameLoop);
        }
      }
    }
  });
}

/* ===============================
   GAME LOOP
================================ */
function gameLoop(ts) {
  if (!gameStarted) return;

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
  if (!isHost) return;

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

  scoreboard.render(myId);

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

/* ===============================
   RENDER
================================ */
function renderGame() {
  drawGrid();
  if (food) food.draw(ctx);
  for (const id in snakes) {
    drawSnakeColored(snakes[id], id);
  }
}

/* ===============================
   COLORED SNAKE (utan ändring av snake.js)
================================ */
function drawSnakeColored(snake, id) {
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
   INPUT (CLIENT)
================================ */
document.addEventListener("keydown", (e) => {
  if (!isMultiplayer || isHost || !gameStarted) return;

  const dir =
    e.key === "ArrowUp" ? "up" :
    e.key === "ArrowDown" ? "down" :
    e.key === "ArrowLeft" ? "left" :
    e.key === "ArrowRight" ? "right" :
    null;

  if (dir) api.transmit({ input: dir });
});

/* ===============================
   UI HELPERS
================================ */
function hideUI() {
  uiOverlay.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

/* ===============================
   BUTTONS
================================ */
startBtn.onclick = startSingleplayer;
restartBtn.onclick = startSingleplayer;
hostBtn.onclick = startHost;
joinBtn.onclick = joinMultiplayer;
