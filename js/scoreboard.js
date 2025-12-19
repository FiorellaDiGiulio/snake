export class Scoreboard {
  constructor(container) {
    this.container = container;
    this.scores = {};
    this.hueMap = {};
  }

  // Samma id → samma färg
  _hueFromId(id) {
    if (this.hueMap[id] !== undefined) return this.hueMap[id];

    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hues = [0, 90, 180, 270, 45, 315];
    const hue = hues[Math.abs(hash) % hues.length];
    this.hueMap[id] = hue;
    return hue;
  }

  ensurePlayer(id) {
    if (!this.scores[id]) {
      this.scores[id] = 0;
    }
  }

  addPoint(id) {
    this.ensurePlayer(id);
    this.scores[id]++;
  }

  removePlayer(id) {
    delete this.scores[id];
    delete this.hueMap[id];
  }

  reset() {
    this.scores = {};
    this.hueMap = {};
    this.render();
  }

  render(myId = null) {
    this.container.innerHTML = "";

    Object.entries(this.scores).forEach(([id, score]) => {
      const hue = this._hueFromId(id);

      const row = document.createElement("div");
      row.className = "row";

      row.innerHTML = `
        <div class="name">
          <div class="dot" style="
            background:#56a662;
            filter:hue-rotate(${hue}deg);
          "></div>
          ${id === myId ? "Du" : id.slice(0, 4)}
        </div>
        <div>${score}</div>
      `;

      this.container.appendChild(row);
    });
  }
}
