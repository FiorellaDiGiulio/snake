import { mpapi } from "./mpapi.js";
import { Scoreboard } from "./scoreboard.js";
import { Renderer } from "./render.js";
import { SingleplayerGame } from "./singleplayerGame.js";

/* ===============================
   CANVAS
================================ */
const canvas = document.getElementById("gameCanvas");
canvas.width = 800;
canvas.height = 500;

/* ===============================
   CORE
================================ */
const scoreboard = new Scoreboard(document.getElementById("scoreboard"));
const renderer = new Renderer(canvas, scoreboard);

/* ===============================
   UI
================================ */
const uiOverlay = document.getElementById("uiOverlay");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreEl = document.getElementById("finalScore");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

/* ===============================
   GAME INSTANCE
================================ */
let singleGame = null;

/* ===============================
   HELPERS
================================ */
function hideUI() {
  uiOverlay.classList.add("hidden");
}

function showGameOver(score) {
  finalScoreEl.textContent = score;
  uiOverlay.classList.remove("hidden");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
}

/* ===============================
   SINGLEPLAYER
================================ */
function startSingleplayer() {
  if (singleGame) singleGame.stop();

  hideUI();

  singleGame = new SingleplayerGame({
    canvas,
    renderer,
    scoreboard
  });

  singleGame.start();
}

/* ===============================
   GAME OVER EVENT
================================ */
document.addEventListener("singleplayer:gameover", (e) => {
  showGameOver(e.detail.score);
});

/* ===============================
   INPUT (GLOBAL)
================================ */
document.addEventListener("keydown", (e) => {
  const dir =
    e.key === "ArrowUp" ? "up" :
    e.key === "ArrowDown" ? "down" :
    e.key === "ArrowLeft" ? "left" :
    e.key === "ArrowRight" ? "right" :
    null;

  if (!dir) return;
  if (singleGame) singleGame.handleInput(dir);
});

/* ===============================
   BUTTONS
================================ */
startBtn.onclick = startSingleplayer;
restartBtn.onclick = startSingleplayer;
