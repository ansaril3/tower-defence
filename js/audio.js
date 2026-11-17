/* Tiny synthesized soundtrack and effects. No asset files. */
var AudioBus = {
  muted: false,
  ctx: null,
  mode: "menu",
  timer: null,
  next: 0,
  step: 0,
  _noise: null,
  _last: {},

  ensure: function () {
    if (this.muted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.55;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.startScheduler();
  },

  toggle: function () {
    this.muted = !this.muted;
    if (this.muted) this.stopMusic();
    else {
      this.ensure();
      this.startScheduler();
    }
    if (window.paintMute) window.paintMute();
    try {
      if (window.SAVE) {
        window.SAVE.mute = this.muted;
        if (window.persist) window.persist();
      }
    } catch (e) { /* save appears later */ }
  },

  setMode: function (mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.step = 0;
    if (this.ctx) this.next = this.ctx.currentTime + 0.05;
  },

  stopMusic: function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.musicGain) this.musicGain.gain.value = 0;
  },

  startScheduler: function () {
    if (!this.ctx || this.muted) return;
    this.musicGain.gain.value = 0.55;
    if (this.timer) return;
    var self = this;
    this.next = this.ctx.currentTime + 0.06;
    this.timer = setInterval(function () { self.schedule(); }, 90);
    this.schedule();
  },

  tracks: {
    menu: {
      tempo: 92,
      chords: [[262, 330, 392], [220, 262, 330], [196, 247, 294], [175, 220, 262]],
      lead: [392, 440, 392, 330, 349, 392, 330, 262]
    },
    battle: {
      tempo: 110,
      chords: [[220, 262, 330], [175, 220, 262], [196, 247, 294], [233, 294, 349]],
      lead: [440, 466, 440, 392, 349, 392, 440, 330]
    },
    boss: {
      tempo: 128,
      chords: [[110, 165, 220], [98, 147, 196], [87, 131, 175], [98, 147, 220]],
      lead: [330, 349, 330, 294, 262, 294, 330, 220]
    }
  },

  schedule: function () {
    if (!this.ctx || this.muted) return;
    var track = this.tracks[this.mode] || this.tracks.menu;
    var beat = 60 / track.tempo;
    var guard = 0;
    while (this.next < this.ctx.currentTime + 0.22 && guard < 8) {
      var i = this.step % 8;
      if (i % 2 === 0) this.chord(track.chords[(this.step / 2 | 0) % track.chords.length], this.next, beat * 1.6);
      this.tone(track.lead[i], this.next, beat * 0.85, i % 2 ? 0.018 : 0.03, "triangle", this.musicGain);
      if (i % 4 === 0) this.kick(this.next);
      else if (i % 2 === 0 && this.mode !== "menu") this.hat(this.next);
      this.next += beat / 2;
      this.step++;
      guard++;
    }
  },

  env: function (when, dur, peak, dest) {
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, dur));
    g.connect(dest || this.sfxGain);
    return g;
  },

  tone: function (freq, when, dur, peak, type, dest) {
    var o = this.ctx.createOscillator();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, when);
    var g = this.env(when, dur, peak, dest);
    o.connect(g);
    o.start(when);
    o.stop(when + dur + 0.02);
  },

  chord: function (freqs, when, dur) {
    for (var i = 0; i < freqs.length; i++) this.tone(freqs[i], when, dur, 0.012, "sine", this.musicGain);
  },

  kick: function (when) {
    var o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, when);
    o.frequency.exponentialRampToValueAtTime(48, when + 0.12);
    var g = this.env(when, 0.14, this.mode === "boss" ? 0.12 : 0.06, this.musicGain);
    o.connect(g);
    o.start(when);
    o.stop(when + 0.16);
  },

  hat: function (when) {
    this.noise(when, 0.04, 0.03, 1800);
  },

  noise: function (when, dur, peak, freq) {
    var src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf();
    var filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq || 800;
    var g = this.env(when, dur, peak, this.sfxGain);
    src.connect(filter);
    filter.connect(g);
    src.start(when);
    src.stop(when + dur + 0.02);
  },

  noiseBuf: function () {
    if (this._noise) return this._noise;
    var n = this.ctx.sampleRate;
    var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  },

  sfx: function (name) {
    if (this.muted || !this.ctx) return;
    var now = this.ctx.currentTime;
    var gap = { arrow: 0.04, holy: 0.05, dead: 0.04, gryphon: 0.12 }[name] || 0;
    if (gap && now - (this._last[name] || 0) < gap) return;
    this._last[name] = now;
    if (name === "click") this.tone(520, now, 0.07, 0.05, "square");
    else if (name === "place") {
      this.tone(180, now, 0.12, 0.08, "triangle");
      this.tone(420, now + 0.04, 0.1, 0.05, "square");
    }
    else if (name === "arrow") this.tone(760 + Math.random() * 80, now, 0.07, 0.04, "triangle");
    else if (name === "holy") {
      this.tone(660, now, 0.12, 0.05, "sine");
      this.tone(990, now + 0.03, 0.14, 0.04, "sine");
    }
    else if (name === "cannon") this.noise(now, 0.22, 0.2, 380);
    else if (name === "ballista") this.tone(240, now, 0.1, 0.07, "sawtooth");
    else if (name === "gryphon") this.tone(520, now, 0.16, 0.05, "sawtooth");
    else if (name === "coin" || name === "praise") {
      this.tone(880, now, 0.08, 0.05, "square");
      this.tone(1320, now + 0.07, 0.12, 0.04, "square");
    }
    else if (name === "dead") this.tone(320, now, 0.1, 0.04, "triangle");
    else if (name === "horn" || name === "wave") {
      this.tone(349, now, 0.18, 0.07, "sawtooth");
      this.tone(440, now + 0.08, 0.22, 0.06, "sawtooth");
      this.tone(523, now + 0.16, 0.28, 0.05, "triangle");
    }
    else if (name === "roar") this.noise(now, 0.45, 0.18, 220);
    else if (name === "leak") {
      this.tone(196, now, 0.2, 0.08, "sawtooth");
      this.tone(140, now + 0.08, 0.22, 0.07, "triangle");
    }
    else if (name === "victory") {
      [523, 659, 784, 1046].forEach(function (f, i) {
        AudioBus.tone(f, now + i * 0.1, 0.22, 0.07, "triangle");
      });
    }
    else if (name === "defeat") {
      this.tone(311, now, 0.25, 0.07, "triangle");
      this.tone(233, now + 0.16, 0.35, 0.06, "triangle");
    }
    else if (name === "shield") this.tone(180, now, 0.2, 0.06, "sine");
    else if (name === "freeze") this.tone(990, now, 0.18, 0.04, "sine");
    else if (name === "upgrade") {
      this.tone(600, now, 0.08, 0.05, "square");
      this.tone(800, now + 0.06, 0.12, 0.05, "square");
    }
    else if (name === "sell") this.tone(300, now, 0.1, 0.05, "triangle");
  }
};
