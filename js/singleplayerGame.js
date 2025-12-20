import { Snake } from "./snake.js";
import { Food } from "./food.js";

export class SingleplayerGame {
  constructor({ canvas, renderer, scoreboard }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.scoreboard = scoreboard;

    this.snake = null;
    this.food = null;

    this.running = false;
    this.lastTick = 0;
    this.TICK_RATE = 120;

    this.playerId = "Du";

    this.loop = this.loop.bind(this);
  }

  start() {
    this.snake = new Snake(this.canvas);
    this.food = new Food(this.canvas, this.snake);

    this.scoreboard.reset();
    this.scoreboard.ensurePlayer(this.playerId);
    this.scoreboard.render(this.playerId);

    this.running = true;
    this.lastTick = 0;

    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  handleInput(dir) {
    if (!this.running || !this.snake) return;

    this.snake.direction =
      dir === "up" ? { x: 0, y: -1 } :
      dir === "down" ? { x: 0, y: 1 } :
      dir === "left" ? { x: -1, y: 0 } :
      { x: 1, y: 0 };
  }

  loop(ts) {
    if (!this.running) return;

    if (ts - this.lastTick > this.TICK_RATE) {
      this.update();
      this.lastTick = ts;
    }

    this.render();
    requestAnimationFrame(this.loop);
  }

  update() {
  this.snake.update();

  // 🔴 GAME OVER
  if (this.snake.dead) {
    this.stop();

    // säg till main/UI att spelet är slut
    document.dispatchEvent(
      new CustomEvent("singleplayer:gameover", {
        detail: {
          score: this.scoreboard.scores[this.playerId] ?? 0
        }
      })
    );

    return;
  }

  // 🟢 Äta mat
  if (
    this.snake.head.x === this.food.position.x &&
    this.snake.head.y === this.food.position.y
  ) {
    this.snake.grow();
    this.food.respawn(this.snake);

    this.scoreboard.addPoint(this.playerId);
    this.scoreboard.render(this.playerId);
  }
}


  
  render() {
    this.renderer.draw(
      { [this.playerId]: this.snake },
      this.food,
      this.playerId
    );
  }
}
