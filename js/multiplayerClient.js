import { Snake } from "./snake.js";
import { Food } from "./food.js";

export class multiplayerClient {
  constructor({ api, canvas, scoreboard, render }) {
    this.api = api;
    this.canvas = canvas;
    this.scoreboard = scoreboard;
    this.render = render;

    this.snakes = {};
    this.food = null;
    this.gameStarted = false;
    this.lastTick = 0;
    this.TICK_RATE = 120;
  }

  async start(sessionCode) {
    const res = await this.api.join(sessionCode);
    this.myId = res.clientId;

    this.scoreboard.reset();
    this.scoreboard.ensurePlayer(this.myId);
    this.scoreboard.render(this.myId);

    this.listen();
  }

  listen() {
    this.api.listen((event, _, clientId, data) => {

      if (event === "game" && data.type === "state") {
        this.snakes = {};

        Object.entries(data.snakes).forEach(([id, s]) => {
          const snake = new Snake(this.canvas);
          snake.body = s.body;
          snake.direction = s.direction;
          this.snakes[id] = snake;
          this.scoreboard.ensurePlayer(id);
        });

        if (!this.food && this.snakes[this.myId]) {
          this.food = new Food(this.canvas, this.snakes[this.myId]);
        }

        this.food.position = data.food;
        this.scoreboard.scores = data.scores || {};
        this.scoreboard.render(this.myId);

        if (!this.gameStarted) {
          this.gameStarted = true;
          requestAnimationFrame(this.loop.bind(this));
        }
      }
    });
  }

  loop(ts) {
    if (!this.gameStarted) return;

    if (ts - this.lastTick > this.TICK_RATE) {
      this.lastTick = ts;
    }

    this.render.draw(this.snakes, this.food, this.myId);
    requestAnimationFrame(this.loop.bind(this));
  }

  sendInput(dir) {
    this.api.transmit({ input: dir });
  }
}
