import { Snake } from "./snake.js";
import { Food } from "./food.js";

export class multiplayerHost {
  constructor({ api, canvas, scoreboard, render }) {
    this.api = api;
    this.canvas = canvas;
    this.scoreboard = scoreboard;
    this.render = render;

    this.snakes = {};
    this.food = null;
    this.inputs = {};
    this.gameStarted = false;
    this.lastTick = 0;
    this.TICK_RATE = 120;
  }

  async start() {
    const { session, clientId } = await this.api.host();
    this.myId = clientId;

    alert("Session code: " + session + "\nVäntar på spelare...");

    this.snakes[this.myId] = new Snake(this.canvas);
    this.food = new Food(this.canvas, this.snakes[this.myId]);

    this.scoreboard.reset();
    this.scoreboard.ensurePlayer(this.myId);
    this.scoreboard.render(this.myId);

    this.listen();
  }

  listen() {
    this.api.listen((event, _, clientId, data) => {

      // 🔹 Ny spelare
      if (event === "joined") {
        if (!this.snakes[clientId]) {
          this.snakes[clientId] = new Snake(this.canvas);
          this.scoreboard.ensurePlayer(clientId);

          // skicka state direkt
          this.api.transmit({
            type: "state",
            snakes: this.serializeSnakes(),
            food: this.food.position,
            scores: this.scoreboard.scores
          });

          if (Object.keys(this.snakes).length >= 2 && !this.gameStarted) {
            this.gameStarted = true;
            requestAnimationFrame(this.loop.bind(this));
          }
        }
      }

      // 🔹 Input från clients
      if (event === "game" && data.input) {
        this.inputs[clientId] = data.input;
      }
    });
  }

  loop(ts) {
    if (!this.gameStarted) return;

    if (ts - this.lastTick > this.TICK_RATE) {
      this.update();
      this.lastTick = ts;
    }

    this.render.draw(this.snakes, this.food, this.myId);
    requestAnimationFrame(this.loop.bind(this));
  }

  update() {
    for (const id in this.snakes) {
      const s = this.snakes[id];

      if (this.inputs[id]) {
        s.direction =
          this.inputs[id] === "up"    ? { x: 0, y: -1 } :
          this.inputs[id] === "down"  ? { x: 0, y: 1 } :
          this.inputs[id] === "left"  ? { x: -1, y: 0 } :
          { x: 1, y: 0 };
      }

      s.update();
    }

    for (const id in this.snakes) {
      const s = this.snakes[id];
      if (
        s.head.x === this.food.position.x &&
        s.head.y === this.food.position.y
      ) {
        s.grow();
        this.food.respawn(s);
        this.scoreboard.addPoint(id);
      }
    }

    this.scoreboard.render(this.myId);

    this.api.transmit({
      type: "state",
      snakes: this.serializeSnakes(),
      food: this.food.position,
      scores: this.scoreboard.scores
    });
  }

  serializeSnakes() {
    return Object.fromEntries(
      Object.entries(this.snakes).map(([id, s]) => [
        id,
        { body: s.body, direction: s.direction }
      ])
    );
  }
}
