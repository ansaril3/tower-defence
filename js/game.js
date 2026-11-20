/* Lordaeron tower defence. Classic portraits in the menus, spell effects on the field. */
var COLS = 16, ROWS = 10, CELL = 60, SEQ = 1;
var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
var ICONS = {};
var SAVE = { best: {}, difficulty: "normal", mute: false, free: false };
var G = {
  screen: "menu", time: 0, speed: 1, paused: false,
  enemies: [], towers: [], shots: [], fx: [], texts: [],
  mouse: { x: 0, y: 0, inside: false, cell: null },
  itemPick: null
};
var cv, gfx, resetArm = false, backArm = false;

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

var THEMES = {
  hillsbrad: { grass: "#3e8f46", grass2: "#57a85a", road: "#e0c07a", road2: "#b8894e", water: "#3c92d4", tree: "#1e6a32", trunk: "#6b4a2a" },
  plague: { grass: "#5c6234", grass2: "#6e7640", road: "#8a8074", road2: "#5c554c", water: "#3d4a62", tree: "#3e4630", trunk: "#4a4038" },
  city: { grass: "#6d7a86", grass2: "#87949f", road: "#c4beb4", road2: "#8d877e", water: "#4d6e8a", tree: "#2f6a40", trunk: "#5c4632" },
  elf: { grass: "#1f6d55", grass2: "#2f8a68", road: "#d4b36a", road2: "#8d7340", water: "#2e8ea8", tree: "#14724a", trunk: "#6a5030" },
  snow: { grass: "#d5e4ef", grass2: "#f2f7fb", road: "#9aa6b4", road2: "#6e7888", water: "#7eb6d8", tree: "#1d4a38", trunk: "#5a4636" },
  dalaran: { grass: "#3a3f6a", grass2: "#51568a", road: "#b2a6cc", road2: "#6e6588", water: "#6a5ac8", tree: "#2a345c", trunk: "#4a4060" },
  violet: { grass: "#432e72", grass2: "#5a4294", road: "#cbb6ea", road2: "#7d6aa8", water: "#6a58d8", tree: "#2e2458", trunk: "#4a3860" },
  northrend: { grass: "#b7d0dc", grass2: "#e2f2f8", road: "#93a8b8", road2: "#667888", water: "#6ec0de", tree: "#1a4a44", trunk: "#4e4034" },
  icecrown: { grass: "#8ea8c4", grass2: "#d5e4f4", road: "#7e92a8", road2: "#4e6074", water: "#4aa0c8", tree: "#1a3348", trunk: "#3e342c" },
  nerub: { grass: "#3a3428", grass2: "#4e4638", road: "#6e5a44", road2: "#3e3428", water: "#2a3848", tree: "#2a241c", trunk: "#1a1612" },
  naxx: { grass: "#3e4a32", grass2: "#556844", road: "#8a8470", road2: "#5c5848", water: "#3a4a38", tree: "#2a3824", trunk: "#3e3428" }
};
function towerColor(id) {
  var d = Campaign.TOWERS[id];
  return d && d.color ? d.color : "#e6c56a";
}
function heroOpen(id) {
  var def = Campaign.TOWERS[id];
  if (!def) return false;
  if (SAVE.free) return true;
  return !!(G.level && G.level.id >= def.unlock);
}
function paintLine(el, text) {
  if (!el) return;
  var raw = String(text);
  var html = raw.replace(/ (?:зл\.|золота|золото)/g, '<span class="coin" role="img" aria-label="золото"></span>');
  if (el.getAttribute("data-line") === html) return;
  el.setAttribute("data-line", html);
  if (html === raw) el.textContent = raw;
  else el.innerHTML = html;
}

function loadSave() {
  try {
    var raw = localStorage.getItem("lordaeron-guards-v2");
    if (!raw) return;
    var p = JSON.parse(raw);
    SAVE.best = p.best || {};
    SAVE.difficulty = Campaign.DIFF[p.difficulty] ? p.difficulty : "normal";
    SAVE.mute = !!p.mute;
    if (typeof p.free === "boolean") SAVE.free = p.free;
  } catch (e) { /* ignore broken saves */ }
}
function persist() { localStorage.setItem("lordaeron-guards-v2", JSON.stringify(SAVE)); }
window.SAVE = SAVE;
window.persist = persist;

function maxCleared() {
  var m = 0;
  for (var k in SAVE.best) if (SAVE.best[k]) m = Math.max(m, +k);
  return m;
}
function nextChapter() {
  var last = Campaign.LEVELS.length;
  return maxCleared() >= last ? last : Math.min(last, maxCleared() + 1);
}
function paintMute() {
  var b = document.getElementById("btn-mute");
  if (b) b.textContent = AudioBus.muted ? "🔇" : "🔊";
}
function showScreen(name) {
  G.screen = name;
  ["menu", "story", "play", "result"].forEach(function (id) {
    document.getElementById("screen-" + id).classList.toggle("hidden", id !== name);
  });
}
function rememberIcon(key, src) {
  var img = new Image();
  img.onload = function () { ICONS[key] = img; };
  img.src = src;
}
function loadIcons() {
  Campaign.ORDER.forEach(function (id) {
    var sk = Campaign.SKILLS[id];
    rememberIcon(id, "assets/icons/heroes/" + id + ".png");
    if (!sk) return;
    for (var lv = 1; lv <= sk.ranks; lv++) {
      rememberIcon("skill:" + id + ":" + lv, "assets/icons/skills/" + sk.file + (lv > 1 ? lv : "") + ".png");
    }
  });
  Campaign.ITEM_ORDER.forEach(function (id) { rememberIcon("item:" + id, "assets/icons/items/" + id + ".png"); });
  Object.keys(Campaign.ENEMIES).forEach(function (id) { rememberIcon(id, "assets/icons/units/" + id + ".png"); });
  rememberIcon("scarab", "assets/icons/skills/CarrionSwarm.png");
  rememberIcon("anub", "assets/icons/skills/CarrionSwarm3.png");
  rememberIcon("wail", "assets/icons/heroes/qop.png");
  rememberIcon("familiar", "assets/icons/units/familiar.png");
  ["guard", "uther", "muradin", "falstad", "jaina", "arthas"].forEach(function (id) {
    rememberIcon("story:" + id, "assets/icons/story/" + id + ".png");
  });
  rememberIcon("story:alleria", "assets/icons/story/alleria.jpg");
  rememberIcon("story:malganis", "assets/icons/units/malganis.png");
  rememberIcon("story:terenas", "assets/icons/story/terenas.png");
  rememberIcon("story:you", "assets/icons/story/you.png");
  rememberIcon("story:corvtrue", "assets/icons/story/corvtrue.png");
}
function iconReady(id) {
  var img = ICONS[id];
  return !!(img && img.complete && img.naturalWidth);
}
function drawIcon(ctx, id, x, y, size) {
  if (!iconReady(id)) return false;
  var left = x - size / 2, top = y - size, r = Math.max(3, size * 0.12);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(left, top, size, size, r);
  ctx.clip();
  ctx.drawImage(ICONS[id], left, top, size, size);
  ctx.restore();
  return true;
}

function boot() {
  cv = document.getElementById("cv");
  gfx = cv.getContext("2d");
  loadSave();
  AudioBus.muted = !!SAVE.mute;
  paintMute();
  loadIcons();
  bind();
  renderMenu();
  showScreen("menu");
  AudioBus.setMode("menu");
  requestAnimationFrame(frame);
}

function bind() {
  document.addEventListener("pointerdown", function () { AudioBus.ensure(); }, true);
  document.getElementById("btn-mute").addEventListener("click", function () { AudioBus.toggle(); });
  document.getElementById("btn-continue").addEventListener("click", function () {
    openLevel(nextChapter());
  });
  document.getElementById("btn-help").addEventListener("click", function () {
    document.getElementById("modal-help").classList.remove("hidden");
  });
  document.getElementById("btn-heroes").addEventListener("click", function () {
    renderHeroBook();
    document.getElementById("modal-heroes").classList.remove("hidden");
  });
  document.getElementById("heroes-close").addEventListener("click", function () {
    document.getElementById("modal-heroes").classList.add("hidden");
  });
  document.getElementById("modal-heroes").addEventListener("click", function (e) {
    if (e.target.id === "modal-heroes") e.currentTarget.classList.add("hidden");
  });
  document.getElementById("btn-items").addEventListener("click", function () {
    renderItemBook();
    document.getElementById("modal-items").classList.remove("hidden");
  });
  document.getElementById("items-close").addEventListener("click", function () {
    document.getElementById("modal-items").classList.add("hidden");
  });
  document.getElementById("modal-items").addEventListener("click", function (e) {
    if (e.target.id === "modal-items") e.currentTarget.classList.add("hidden");
  });
  document.getElementById("help-close").addEventListener("click", function () {
    document.getElementById("modal-help").classList.add("hidden");
  });
  document.getElementById("modal-help").addEventListener("click", function (e) {
    if (e.target.id === "modal-help") e.currentTarget.classList.add("hidden");
  });
  document.getElementById("btn-free").addEventListener("click", function () {
    SAVE.free = !SAVE.free;
    persist();
    renderMenu();
    AudioBus.sfx("click");
  });
  document.getElementById("btn-reset").addEventListener("click", function () {
    var b = this;
    if (!resetArm) {
      resetArm = true;
      b.textContent = "Точно стереть?";
      setTimeout(function () { resetArm = false; b.textContent = "Сбросить путь"; }, 2400);
      return;
    }
    resetArm = false;
    b.textContent = "Сбросить путь";
    SAVE.best = {};
    persist();
    renderMenu();
  });
  document.getElementById("diffs").addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    SAVE.difficulty = btn.dataset.diff;
    persist();
    renderMenu();
    AudioBus.sfx("click");
  });
  document.getElementById("story-go").addEventListener("click", function () { startLevel(G.pendingId); });
  document.getElementById("btn-wave").addEventListener("click", beginWave);
  document.getElementById("btn-horn").addEventListener("click", useHorn);
  document.getElementById("btn-pause").addEventListener("click", function () { G.paused = !G.paused; });
  document.getElementById("btn-speed").addEventListener("click", function () {
    G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1;
    this.textContent = G.speed + "×";
  });
  document.getElementById("btn-back").addEventListener("click", function () {
    var b = this;
    if (!backArm) {
      backArm = true;
      b.textContent = "Точно уйти?";
      setTimeout(function () { backArm = false; b.textContent = "В лагерь"; }, 2200);
      return;
    }
    backArm = false;
    b.textContent = "В лагерь";
    showMenu();
  });
  document.getElementById("btn-up").addEventListener("click", upgradeSel);
  document.getElementById("btn-sell").addEventListener("click", sellSel);
  document.getElementById("btn-equip").addEventListener("click", function () {
    var t = selectedTower();
    if (t && G.itemPick) buyItem(t.id, G.itemPick);
  });
  document.getElementById("result-next").addEventListener("click", function () {
    if (G.ending === "win" && G.level.id < Campaign.LEVELS.length) openLevel(G.level.id + 1);
    else showMenu();
  });
  document.getElementById("result-retry").addEventListener("click", function () { startLevel(G.level.id); });
  document.getElementById("result-menu").addEventListener("click", showMenu);
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerleave", function () { G.mouse.inside = false; G.mouse.cell = null; });
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); disarm(); });
  window.addEventListener("resize", fit);
  window.addEventListener("keydown", onKey);
}

function onKey(e) {
  var k = e.key.toLowerCase();
  if (k === "m") { AudioBus.toggle(); return; }
  if (G.screen === "story" && e.key === "Enter") { startLevel(G.pendingId); return; }
  if (G.screen === "result" && e.key === "Enter") {
    if (G.ending === "win" && G.level.id < Campaign.LEVELS.length) openLevel(G.level.id + 1);
    else if (G.ending === "win") showMenu();
    else startLevel(G.level.id);
    return;
  }
  if (G.screen !== "play") return;
  if (k === "p") G.paused = !G.paused;
  if (e.key === "Escape") disarm();
  if (e.key === " ") { e.preventDefault(); beginWave(); }
  if (k === "u") upgradeSel();
  if ("12345".indexOf(k) >= 0) {
    var id = Campaign.ORDER[+k - 1];
    if (id && heroOpen(id)) arm(id);
  }
}

function renderMenu() {
  var diffs = document.getElementById("diffs");
  diffs.innerHTML = "";
  ["easy", "normal", "hard"].forEach(function (id) {
    var d = Campaign.DIFF[id];
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.diff = id;
    b.className = SAVE.difficulty === id ? "on" : "";
    b.innerHTML = d.name + "<small>" + d.lives + " жизней</small>";
    diffs.appendChild(b);
  });
  paintLine(document.getElementById("diff-line"), Campaign.DIFF[SAVE.difficulty].line);
  var root = document.getElementById("nodes");
  root.innerHTML = "";
  var last = Campaign.LEVELS.length;
  var open = SAVE.free ? last : maxCleared() + 1;
  var stars = 0;
  var frontier = nextChapter();
  var freeBtn = document.getElementById("btn-free");
  if (freeBtn) freeBtn.textContent = SAVE.free ? "Все главы: вкл" : "Все главы: выкл";
  Campaign.LEVELS.forEach(function (lv) {
    var best = SAVE.best[lv.id];
    var rank = best ? Campaign.DIFF[best].rank : 0;
    stars += rank;
    var locked = !SAVE.free && lv.id > open;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "node" + (lv.boss ? " boss" : "") + (locked ? " locked" : "") + (!locked && lv.id === frontier ? " pulse" : "");
    b.disabled = locked;
    b.innerHTML = "<span>Глава " + lv.id + "</span><b>" + lv.short + "</b><i>" + "★★★☆☆☆".slice(3 - rank, 6 - rank) + "</i>";
    b.addEventListener("click", function () { openLevel(lv.id); });
    root.appendChild(b);
  });
  document.getElementById("star-total").textContent = stars + " / " + (last * 3);
  document.getElementById("btn-continue").textContent = maxCleared() >= last ? "Трон снова" : "В поход · глава " + frontier;
}

function showMenu() {
  G.paused = false;
  renderMenu();
  showScreen("menu");
  AudioBus.setMode("menu");
}
var FACES = {
  you: ["Ты", "assets/icons/story/you.png", "Командир хилсбрадской заставы. В первую ночь закрыл восточную дорогу по королевскому приказу и дошёл с этой бумагой до Ледяного Трона."],
  corv: ["Корв", "assets/icons/story/guard.png", "Адъютант заставы. В первую ночь прочитал приказ с королевским воском и с тех пор носит печать рядом с командиром."],
  corvtrue: ["Корв", "assets/icons/story/corvtrue.png", "Адъютант заставы. В первую ночь прочитал приказ с королевским воском и с тех пор носит печать рядом с командиром."],
  uther: ["Утер", "assets/icons/story/uther.png", "Паладин Света. Пришёл на рассвете после первой ночи и молча шёл следом, пока у дверей зала не заговорил вслух."],
  muradin: ["Мурадин", "assets/icons/story/muradin.png", "Гном с молотом. Когда-то учил Артаса держать рукоять и с окраины столицы не отстал от отряда."],
  terenas: ["Теренас", "assets/icons/story/terenas.png", "Король Лордерона. Послал сына на север и просил вернуть его, пока принц ещё оборачивается. Сам остался держать город."],
  malganis: ["Мал'Ганис", "assets/icons/units/malganis.png", "Натрезим на арке ворот. Звал принца по имени и был приманкой, чтобы Артас сам пришёл к шлему."],
  alleria: ["Аллерия", "assets/icons/story/alleria.jpg", "Следопыт Луносвета. Встретила отряд у Солнечного колодца, провела до реки Элрендар и в горы не пошла."],
  falstad: ["Фалстад", "assets/icons/story/falstad.png", "Наездник на грифоне. С высоты видел, как принц едет один и не оглядывается, и не раз садился рядом с отрядом."],
  jaina: ["Джайна", "assets/icons/story/jaina.png", "Чародейка из Даларана. Догнала отряд у перевала, а в библиотеке сличила два приказа за один день и узнала руку Корва."],
  arthas: ["Артас", "assets/icons/story/arthas.png", "Принц Лордерона. Уехал на север один. В библиотеке сказал голосу метели «нет», и на троне шлем так и не взял."],
  butcher: ["Мясник", "assets/icons/units/butcher.png", "Великан с альтеракского перевала. Раньше резал мясо на рынке, пока не поверил обещанию Плети, что голод кончится."],
  anub: ["Ануб'арак", "assets/icons/skills/CarrionSwarm3.png", "Король Азжол-Неруба. Проваливается под тропу и вылезает дальше, а пока живы его жуки, панцирь почти не берётся."],
  captain: ["Стража", "assets/icons/story/guard.png", "Капитан стражи. Собирает людей, если заставу оттеснили, и напоминает, что дорога ещё ваша."]
};
var SCENE = {
  1: { before: ["you", "corv"], after: ["you", "corv", "uther"] },
  2: { before: ["you", "corv", "uther"], after: ["you", "corv", "uther"] },
  3: { before: ["you", "corv", "uther", "muradin", "terenas"], after: ["you", "corv", "uther", "muradin", "terenas"] },
  4: { before: ["you", "corv", "uther", "muradin", "terenas", "malganis"], after: ["you", "corv", "uther", "muradin", "terenas"] },
  5: { before: ["you", "corv", "uther", "muradin", "terenas", "malganis"], after: ["you", "corv", "uther", "muradin", "terenas", "malganis"] },
  6: { before: ["you", "corv", "uther", "muradin", "alleria"], after: ["you", "corv", "uther", "muradin", "alleria"] },
  7: { before: ["you", "corv", "uther", "muradin", "alleria"], after: ["you", "corv", "uther", "muradin", "alleria", "falstad"] },
  8: { before: ["you", "corv", "uther", "muradin"], after: ["you", "corv", "uther", "muradin"] },
  9: { before: ["you", "corv", "uther", "muradin"], after: ["you", "corv", "uther", "muradin", "falstad"] },
  10: { before: ["you", "corv", "uther", "muradin", "butcher"], after: ["you", "corv", "uther", "muradin", "jaina"] },
  11: { before: ["you", "corv", "uther", "muradin", "jaina"], after: ["you", "corv", "uther", "muradin", "jaina"] },
  12: { before: ["you", "corv", "uther", "muradin", "jaina"], after: ["you", "corv", "uther", "muradin", "jaina"] },
  13: { before: ["you", "corv", "uther", "muradin", "jaina"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas"] },
  14: { before: ["you", "corv", "uther", "muradin", "jaina", "arthas"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas"] },
  15: { before: ["you", "corv", "uther", "muradin", "jaina", "arthas"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas", "anub"] },
  16: { before: ["you", "corv", "uther", "muradin", "jaina", "arthas", "falstad"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas", "falstad"] },
  17: { before: ["you", "corv", "uther", "muradin", "jaina", "arthas"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas"] },
  18: { before: ["you", "corv", "uther", "muradin", "jaina", "arthas"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas"] },
  19: { before: ["you", "corv", "uther", "muradin", "jaina", "arthas"], after: ["you", "corv", "uther", "muradin", "jaina", "arthas"] },
  20: { before: ["you", "corvtrue", "uther", "muradin", "jaina", "arthas"], after: ["you", "corvtrue", "uther", "muradin", "jaina", "arthas"] }
};
function faceTip() {
  var tip = document.getElementById("face-tale");
  if (tip) return tip;
  tip = document.createElement("div");
  tip.id = "face-tale";
  tip.className = "face-tale hidden";
  document.body.appendChild(tip);
  return tip;
}
function hideFaceTale() {
  var tip = document.getElementById("face-tale");
  if (tip) tip.classList.add("hidden");
}
function showFaceTale(name, text, anchor) {
  var tip = faceTip();
  tip.innerHTML = "";
  var title = document.createElement("b");
  title.textContent = name;
  var line = document.createElement("p");
  line.textContent = text;
  tip.appendChild(title);
  tip.appendChild(line);
  tip.classList.remove("hidden");
  var r = anchor.getBoundingClientRect();
  var left = r.left + r.width / 2;
  tip.style.left = left + "px";
  tip.style.top = (r.top - 10) + "px";
  tip.style.transform = "translate(-50%, -100%)";
  var box = tip.getBoundingClientRect();
  if (box.top < 8) {
    tip.style.top = (r.bottom + 10) + "px";
    tip.style.transform = "translate(-50%, 0)";
    box = tip.getBoundingClientRect();
  }
  if (box.left < 8) tip.style.left = (left + 8 - box.left) + "px";
  var over = box.right - (window.innerWidth - 8);
  if (over > 0) tip.style.left = (parseFloat(tip.style.left) - over) + "px";
}
function showCast(prefix, ids) {
  hideFaceTale();
  var box = document.getElementById(prefix + "-cast");
  if (!box) return;
  box.innerHTML = "";
  (ids || []).forEach(function (id) {
    var face = FACES[id];
    if (!face) return;
    var fig = document.createElement("figure");
    var img = document.createElement("img");
    img.src = face[1];
    img.alt = face[0];
    var cap = document.createElement("figcaption");
    cap.textContent = face[0];
    fig.appendChild(img);
    fig.appendChild(cap);
    fig.addEventListener("mouseenter", function () { showFaceTale(face[0], face[2], fig); });
    fig.addEventListener("mouseleave", hideFaceTale);
    box.appendChild(fig);
  });
}
function showTalk(prefix, beat, cast) {
  document.getElementById(prefix + "-who").textContent = beat.who;
  document.getElementById(prefix + "-text").textContent = beat.text;
  var tip = document.getElementById(prefix + "-tip");
  var line = beat.tip || "";
  tip.hidden = !line;
  document.getElementById(prefix + "-tip-text").textContent = line;
  showCast(prefix, cast);
}
function openLevel(id) {
  var lv = Campaign.LEVELS[id - 1];
  G.pendingId = id;
  G.storyFig = lv.before.fig;
  document.getElementById("story-kicker").textContent = "Глава " + lv.id + " · " + Campaign.DIFF[SAVE.difficulty].name;
  document.getElementById("story-title").textContent = lv.name;
  showTalk("story", lv.before, SCENE[lv.id].before);
  showScreen("story");
  AudioBus.sfx("click");
}

function mulberry(seed) {
  var a = seed >>> 0;
  return function () {
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function expandPath(points) {
  var cells = [];
  function push(x, y) {
    var last = cells[cells.length - 1];
    if (!last || last[0] !== x || last[1] !== y) cells.push([x, y]);
  }
  for (var i = 0; i < points.length - 1; i++) {
    var x = points[i][0], y = points[i][1];
    var tx = points[i + 1][0], ty = points[i + 1][1];
    push(x, y);
    while (x !== tx || y !== ty) {
      if (x !== tx) x += Math.sign(tx - x);
      else y += Math.sign(ty - y);
      push(x, y);
    }
  }
  return cells;
}
function prepare(level) {
  var cells = expandPath(level.path);
  var pathSet = new Set(cells.map(function (c) { return c[0] + "," + c[1]; }));
  var ponds = new Set();
  (level.ponds || []).forEach(function (p) {
    var k = p[0] + "," + p[1];
    if (!pathSet.has(k)) ponds.add(k);
  });
  var dist = [];
  for (var y = 0; y < ROWS; y++) {
    dist[y] = [];
    for (var x = 0; x < COLS; x++) {
      var best = 99;
      for (var i = 0; i < cells.length; i++) best = Math.min(best, Math.max(Math.abs(cells[i][0] - x), Math.abs(cells[i][1] - y)));
      dist[y][x] = best;
    }
  }
  var forest = new Set();
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    var key = x + "," + y;
    if (pathSet.has(key) || ponds.has(key)) continue;
    if (dist[y][x] >= 4) forest.add(key);
  }
  if (level.hint) {
    forest.delete(level.hint[0] + "," + level.hint[1]);
    ponds.delete(level.hint[0] + "," + level.hint[1]);
  }
  var poly = cells.map(function (c) { return { x: (c[0] + 0.5) * CELL, y: (c[1] + 0.5) * CELL }; });
  if (poly.length >= 2) {
    var a = poly[0], b = poly[1];
    var dx = a.x - b.x, dy = a.y - b.y, len = Math.hypot(dx, dy) || 1;
    poly.unshift({ x: a.x + dx / len * 52, y: a.y + dy / len * 52 });
  }
  var d = 0;
  poly[0].d = 0;
  for (var n = 1; n < poly.length; n++) {
    d += Math.hypot(poly[n].x - poly[n - 1].x, poly[n].y - poly[n - 1].y);
    poly[n].d = d;
  }
  var rand = mulberry(level.id * 9973);
  var trees = [];
  forest.forEach(function (k) {
    var xy = k.split(",");
    var tx = +xy[0], ty = +xy[1];
    trees.push({ x: tx * CELL + 12 + rand() * 36, y: ty * CELL + 18 + rand() * 30, s: 0.85 + rand() * 0.45 });
    trees.push({ x: tx * CELL + 8 + rand() * 40, y: ty * CELL + 10 + rand() * 34, s: 0.7 + rand() * 0.4 });
  });
  var flowers = [];
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    key = x + "," + y;
    if (pathSet.has(key) || forest.has(key) || ponds.has(key)) continue;
    if (dist[y][x] >= 2 && rand() < 0.5) flowers.push({ x: x * CELL + rand() * CELL, y: y * CELL + rand() * CELL, c: rand() < 0.5 ? "#f2d15a" : "#e07ab0" });
  }
  var flakes = [];
  for (var f = 0; f < 48; f++) flakes.push({ x: rand() * 960, y: rand() * 600, sp: 16 + rand() * 28, s: 1 + rand() * 2 });
  return { pathSet: pathSet, ponds: ponds, forest: forest, poly: poly, total: d, trees: trees, flowers: flowers, flakes: flakes, hint: level.hint, biome: level.biome, exit: level.exit };
}
function sample(map, dist) {
  var pts = map.poly;
  if (dist <= 0) return { x: pts[0].x, y: pts[0].y, dx: pts[1].x - pts[0].x, dy: pts[1].y - pts[0].y };
  if (dist >= map.total) {
    var a = pts[pts.length - 2], b = pts[pts.length - 1];
    return { x: b.x, y: b.y, dx: b.x - a.x, dy: b.y - a.y };
  }
  for (var i = 1; i < pts.length; i++) {
    if (pts[i].d >= dist) {
      var p = pts[i - 1], q = pts[i], span = q.d - p.d || 1, t = (dist - p.d) / span;
      return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, dx: q.x - p.x, dy: q.y - p.y };
    }
  }
  return { x: pts[0].x, y: pts[0].y, dx: 1, dy: 0 };
}

function startLevel(id) {
  var level = Campaign.LEVELS[id - 1];
  var diff = Campaign.DIFF[SAVE.difficulty];
  G.level = level;
  G.diff = diff;
  G.map = prepare(level);
  G.gold = Math.round(level.gold * diff.gold);
  G.lives = diff.lives;
  G.wave = 0;
  G.running = false;
  G.plan = [];
  G.planI = 0;
  G.spawnT = 0;
  G.towers = [];
  G.enemies = [];
  G.shots = [];
  G.fx = [];
  G.texts = [];
  G.arm = null;
  G.sel = null;
  G.sellArm = false;
  G.itemPick = null;
  G.paused = false;
  G.speed = 1;
  G.hornT = 0;
  G.shake = 0;
  G.banner = { text: level.name, sub: "Поставь героев у дороги и нажми «В бой!»", life: 2.8 };
  G.toast = null;
  G.ending = null;
  G.endT = 0;
  G.seen = {};
  G.combo = 0;
  G.time = 0;
  document.getElementById("hud-chapter").textContent = "Глава " + level.id + " · " + level.short;
  document.getElementById("hud-diff").textContent = diff.name;
  document.getElementById("btn-speed").textContent = "1×";
  document.getElementById("btn-back").textContent = "В лагерь";
  backArm = false;
  showScreen("play");
  renderShop();
  sync();
  fit();
  requestAnimationFrame(fit);
  AudioBus.setMode("battle");
  AudioBus.sfx("wave");
}
function fit() {
  if (!cv) return;
  var stage = document.getElementById("stage");
  var bar = document.getElementById("bossbar");
  var reserve = bar && !bar.hidden ? 54 : 0;
  var maxW = Math.max(64, (stage.clientWidth || 960) - reserve);
  var maxH = Math.max(64, stage.clientHeight || 600);
  var scale = Math.min(maxW / 960, maxH / 600);
  if (!isFinite(scale) || scale <= 0) scale = 1;
  var h = Math.floor(600 * scale);
  cv.style.width = Math.floor(960 * scale) + "px";
  cv.style.height = h + "px";
  if (bar) bar.style.height = h + "px";
}

function renderHeroBook() {
  var root = document.getElementById("hero-book");
  if (!root || root.childElementCount) return;
  var phases = [
    { id: "start", title: "Старт" },
    { id: "mid", title: "Середина" },
    { id: "late", title: "Лейт" }
  ];
  var groups = [
    { id: "range", title: "Дальний бой", line: "Стреляют и колдуют издалека. Можно ставить чуть в стороне от тропы." },
    { id: "melee", title: "Ближний бой", line: "Режут, кричат и минируют рядом с дорогой. Ставь на поворот." }
  ];
  groups.forEach(function (group) {
    var block = document.createElement("section");
    block.className = "roster";
    var title = document.createElement("h3");
    title.textContent = group.title;
    var lead = document.createElement("p");
    lead.className = "lead";
    lead.textContent = group.line;
    block.appendChild(title);
    block.appendChild(lead);
    phases.forEach(function (phase) {
      var ids = Campaign.ORDER.filter(function (id) {
        var def = Campaign.TOWERS[id];
        return def.fight === group.id && def.phase === phase.id;
      });
      if (!ids.length) return;
      var sub = document.createElement("h4");
      sub.textContent = phase.title;
      var grid = document.createElement("div");
      grid.className = "roster-grid";
      ids.forEach(function (id) { grid.appendChild(heroGuideCard(id)); });
      block.appendChild(sub);
      block.appendChild(grid);
    });
    root.appendChild(block);
  });
}
function trimNum(n) {
  return String(Math.round(n * 100) / 100);
}
function joinRanks(levels, pick) {
  return levels.map(pick).join(" / ");
}
function skillLines(def) {
  var lv = def.levels;
  var self = def.attack === "spin" || def.attack === "call" || def.attack === "pulse" || def.attack === "scream";
  var lines = [];
  lines.push("Урон " + joinRanks(lv, function (s) {
    var d = String(s.dmg);
    if (s.shots > 1) d += "×" + s.shots;
    if (s.birds > 1) d += "×" + s.birds;
    return d;
  }));
  lines.push("Удар " + joinRanks(lv, function (s) { return trimNum(s.cd); }) + " с · " +
    (self ? "круг " + joinRanks(lv, function (s) { return s.splash || s.range; })
      : "дальн. " + joinRanks(lv, function (s) { return s.range; })));
  var extra = skillExtra(def);
  if (extra) lines.push(extra);
  return lines;
}
function skillExtra(def) {
  var lv = def.levels;
  var kind = def.attack;
  if (kind === "call") return "Стоп " + joinRanks(lv, function (s) { return Math.round(s.slow * 100) + "%"; });
  if (kind === "nova") return "Круг " + joinRanks(lv, function (s) { return s.splash; }) + " · мороз " + joinRanks(lv, function (s) { return Math.round(s.slow * 100) + "%"; });
  if (kind === "chain") {
    var line = "Прыжки " + joinRanks(lv, function (s) { return s.bounces; });
    if (lv[0].slow) line += " · мороз " + joinRanks(lv, function (s) { return Math.round(s.slow * 100) + "%"; });
    return line;
  }
  if (kind === "line") return "Целей " + joinRanks(lv, function (s) { return s.pierce; });
  if (kind === "stacks") return "На той же цели каждый удар злее, до ×5.4";
  if (kind === "hook") return "Гниль " + joinRanks(lv, function (s) { return s.rot; }) + " · круг " + joinRanks(lv, function (s) { return s.splash; });
  if (kind === "pulse") return "Ещё " + joinRanks(lv, function (s) { return trimNum(s.pct * 100) + "%"; }) + " от жизни";
  if (kind === "scream") return "Каждый 3-й крик — волна сквозь ряд";
  if (kind === "birds") return "Гаргулий " + joinRanks(lv, function (s) { return s.birds; });
  if (kind === "mine") return "Взрыв " + joinRanks(lv, function (s) { return s.splash; });
  if (kind === "ravage") return "Реведж " + joinRanks(lv, function (s) { return s.ult; }) + " · круг " + joinRanks(lv, function (s) { return s.ultR; }) + " · раз в " + joinRanks(lv, function (s) { return s.ultCd; }) + " с";
  return "";
}
function heroGuideCard(id) {
  var def = Campaign.TOWERS[id];
  var sk = Campaign.SKILLS[id];
  var card = document.createElement("article");
  card.className = "hero-card";
  var face = document.createElement("img");
  face.className = "portrait";
  face.src = "assets/icons/heroes/" + id + ".png";
  face.alt = def.name;
  var body = document.createElement("div");
  var top = document.createElement("div");
  top.className = "top";
  var name = document.createElement("b");
  name.textContent = def.name;
  var phase = document.createElement("span");
  phase.className = "phase " + def.phase;
  phase.textContent = def.phase === "start" ? "Старт" : def.phase === "late" ? "Лейт" : "Середина";
  top.appendChild(name);
  top.appendChild(phase);
  var skill = document.createElement("div");
  skill.className = "skill";
  if (sk) {
    var icon = document.createElement("img");
    icon.src = "assets/icons/skills/" + sk.file + ".png";
    icon.alt = "";
    var skillName = document.createElement("span");
    skillName.textContent = sk.name;
    skill.appendChild(icon);
    skill.appendChild(skillName);
  }
  var pick = document.createElement("p");
  paintLine(pick, def.pick || def.good);
  var cost = document.createElement("p");
  cost.className = "cost";
  paintLine(cost, def.cost + " зл. · с главы " + def.unlock);
  body.appendChild(top);
  body.appendChild(skill);
  skillLines(def).forEach(function (line) {
    var stat = document.createElement("p");
    stat.className = "stat-line";
    stat.textContent = line;
    body.appendChild(stat);
  });
  body.appendChild(pick);
  body.appendChild(cost);
  card.appendChild(face);
  card.appendChild(body);
  return card;
}
function renderItemBook() {
  var root = document.getElementById("item-book");
  if (!root || root.childElementCount) return;
  var phases = [
    { id: "start", title: "Старт" },
    { id: "mid", title: "Середина" },
    { id: "late", title: "Лейт" }
  ];
  var groups = [
    { id: "all", title: "Всем героям", line: "Сапоги, урон, замедление и слабость. Работают и на круге, и на стреле." },
    { id: "hit", title: "Меткий удар", line: "Топор и Мьеллнир — только Тракса, Снайпер, Виндраннер, Урса, Пудж и Визаж." },
    { id: "path", title: "У тропы", line: "Радианс жжёт вокруг героя, не вокруг цели. Носителя ставь вплотную к дороге." }
  ];
  groups.forEach(function (group) {
    var block = document.createElement("section");
    block.className = "roster";
    var title = document.createElement("h3");
    title.textContent = group.title;
    var lead = document.createElement("p");
    lead.className = "lead";
    lead.textContent = group.line;
    block.appendChild(title);
    block.appendChild(lead);
    phases.forEach(function (phase) {
      var ids = Campaign.ITEM_ORDER.filter(function (id) {
        var def = Campaign.ITEMS[id];
        return def.lane === group.id && def.phase === phase.id;
      });
      if (!ids.length) return;
      ids.sort(function (a, b) { return Campaign.ITEMS[a].cost - Campaign.ITEMS[b].cost; });
      var sub = document.createElement("h4");
      sub.textContent = phase.title;
      var grid = document.createElement("div");
      grid.className = "roster-grid";
      ids.forEach(function (id) { grid.appendChild(itemGuideCard(id)); });
      block.appendChild(sub);
      block.appendChild(grid);
    });
    root.appendChild(block);
  });
}
function itemGuideCard(id) {
  var def = Campaign.ITEMS[id];
  var card = document.createElement("article");
  card.className = "hero-card";
  var face = document.createElement("img");
  face.className = "portrait";
  face.src = "assets/icons/items/" + id + ".png";
  face.alt = def.name;
  var body = document.createElement("div");
  var top = document.createElement("div");
  top.className = "top";
  var name = document.createElement("b");
  name.textContent = def.name;
  var phase = document.createElement("span");
  phase.className = "phase " + def.phase;
  phase.textContent = def.phase === "start" ? "Старт" : def.phase === "late" ? "Лейт" : "Середина";
  top.appendChild(name);
  top.appendChild(phase);
  body.appendChild(top);
  (def.stats || []).forEach(function (line) {
    var stat = document.createElement("p");
    stat.className = "stat-line";
    stat.textContent = line;
    body.appendChild(stat);
  });
  var pick = document.createElement("p");
  paintLine(pick, def.pick || def.blurb);
  var cost = document.createElement("p");
  cost.className = "cost";
  paintLine(cost, def.cost + " зл.");
  body.appendChild(pick);
  body.appendChild(cost);
  card.appendChild(face);
  card.appendChild(body);
  return card;
}
function renderShop() {
  var root = document.getElementById("shop");
  root.innerHTML = "";
  Campaign.ORDER.forEach(function (id) {
    var def = Campaign.TOWERS[id];
    var locked = !heroOpen(id);
    var b = document.createElement("button");
    b.type = "button";
    b.className = "card";
    b.dataset.id = id;
    b.disabled = locked;
    var wrap = document.createElement("span");
    wrap.className = "face-wrap";
    var face = document.createElement("img");
    face.className = "portrait";
    face.src = "assets/icons/heroes/" + id + ".png";
    face.alt = def.name;
    face.addEventListener("error", function () {
      var canvas = document.createElement("canvas");
      canvas.width = 58;
      canvas.height = 58;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#121a2c";
      ctx.fillRect(0, 0, 58, 58);
      drawChibi(ctx, id, 29, 50, 1.15, { phase: 0.4 });
      face.replaceWith(canvas);
    });
    wrap.appendChild(face);
    var sk = Campaign.SKILLS[id];
    if (sk) {
      var badge = document.createElement("img");
      badge.className = "skill-badge";
      badge.src = "assets/icons/skills/" + sk.file + ".png";
      badge.alt = sk.name;
      badge.title = sk.name;
      wrap.appendChild(badge);
    }
    var label = document.createElement("span");
    label.className = "card-label";
    var name = document.createElement("b");
    name.textContent = def.name;
    var cost = document.createElement("small");
    paintLine(cost, locked ? "с главы " + def.unlock : def.cost + " зл.");
    label.appendChild(name);
    label.appendChild(cost);
    b.appendChild(wrap);
    b.appendChild(label);
    b.addEventListener("click", function () { if (!locked) arm(id); });
    root.appendChild(b);
  });
}
function preview(wave) {
  var m = {};
  wave.groups.forEach(function (grp) { m[grp.type] = (m[grp.type] || 0) + grp.count; });
  return Object.keys(m).map(function (t) {
    var e = Campaign.ENEMIES[t];
    return (e.boss ? "★ " : "") + e.name + " ×" + m[t];
  }).join(" · ");
}
function sync() {
  document.getElementById("gold").textContent = G.gold;
  document.getElementById("lives").textContent = G.lives;
  var total = G.level.waves.length;
  var n = Math.min(total, G.wave + 1);
  document.getElementById("wave-label").textContent = "Волна " + n + " / " + total;
  var bw = document.getElementById("btn-wave");
  bw.disabled = !!G.running || !!G.ending;
  bw.textContent = G.running ? "Волна идёт…" : "В бой!  ·  +8";
  bw.classList.toggle("pulse", G.level.id === 1 && G.towers.length > 0 && !G.running && G.wave === 0);
  var wave = G.level.waves[G.wave];
  document.getElementById("preview").textContent = wave ? ((G.running ? "Сейчас: " : "Скоро: ") + preview(wave)) : "Тропа чиста";
  document.querySelectorAll(".card").forEach(function (btn) {
    var id = btn.dataset.id;
    var def = Campaign.TOWERS[id];
    var locked = !heroOpen(id);
    btn.classList.toggle("on", G.arm === id);
    btn.classList.toggle("poor", !locked && G.gold < def.cost);
    btn.classList.toggle("pulse", G.level.id === 1 && !G.towers.length && !G.arm && id === "drow");
  });
  syncDetail();
}
function paintDetailIcon(id) {
  var img = document.getElementById("detail-icon");
  if (!img) return;
  if (!id || !Campaign.TOWERS[id]) { img.hidden = true; img.removeAttribute("src"); return; }
  img.hidden = false;
  img.src = "assets/icons/heroes/" + id + ".png";
  img.alt = Campaign.TOWERS[id].name;
}
function syncDetail() {
  var title = document.getElementById("detail-title");
  var text = document.getElementById("detail-text");
  var stat = document.getElementById("detail-stat");
  var up = document.getElementById("btn-up");
  var sell = document.getElementById("btn-sell");
  var tower = selectedTower();
  if (tower) {
    var def = Campaign.TOWERS[tower.type];
    var st = def.levels[tower.lv - 1];
    paintDetailIcon(tower.type);
    paintLine(title, def.name + " · ступень " + tower.lv);
    paintSkill(tower.type, tower.lv);
    text.textContent = st.text + " " + def.good;
    stat.textContent = "Урон " + st.dmg + " · удар " + cdOf(tower).toFixed(1) + " с · вещи " + tower.items.length + "/3";
    up.hidden = false;
    sell.hidden = false;
    renderItems(tower);
    renderItemCard(tower);
    if (tower.lv >= 3) { up.disabled = true; up.textContent = "Максимум"; }
    else {
      var c = def.up[tower.lv - 1];
      up.disabled = G.gold < c;
      up.textContent = "Улучшить · " + c;
    }
    sell.textContent = G.sellArm ? "Точно продать?" : "Продать · +" + refundOf(tower);
    return;
  }
  renderItems(null);
  renderItemCard(null);
  up.hidden = true;
  sell.hidden = true;
  if (G.arm) {
    var armed = Campaign.TOWERS[G.arm];
    var s0 = armed.levels[0];
    paintDetailIcon(G.arm);
    paintLine(title, armed.name + " · " + armed.cost + " золота");
    paintSkill(G.arm, 1);
    text.textContent = armed.blurb + " " + armed.good;
    stat.textContent = s0.text;
    return;
  }
  paintDetailIcon(null);
  paintLine(title, "Выбери героя");
  paintSkill(null, 1);
  text.textContent = "Нажми карточку внизу и поставь героя на траву у дороги. Потом купи ему вещи: сапоги ускоряют удары, топор даёт сплэш.";
  stat.textContent = "Правая кнопка мыши или Esc — отмена.";
}
function paintSkill(id, lv) {
  var row = document.getElementById("detail-skill");
  var sk = id && Campaign.SKILLS[id];
  if (!row) return;
  if (!sk) { row.hidden = true; return; }
  var rank = Math.min(lv || 1, sk.ranks || 1);
  row.hidden = false;
  document.getElementById("detail-skill-icon").src = "assets/icons/skills/" + sk.file + (rank > 1 ? rank : "") + ".png";
  document.getElementById("detail-skill-name").textContent = sk.name;
}
function tickHUD() {
  var bosses = G.enemies.filter(function (e) { return e.alive && e.boss; });
  bosses.sort(function (a, b) { return b.dist - a.dist; });
  var bar = document.getElementById("bossbar");
  var showBar = !!(bosses.length && G.screen === "play");
  if (bar.hidden === showBar) {
    bar.hidden = !showBar;
    fit();
  }
  if (showBar) {
    document.getElementById("bossbar-name").textContent = bosses[0].name;
    var fill = document.getElementById("bossbar-fill");
    fill.style.height = Math.max(0, bosses[0].hp / bosses[0].maxHp * 100) + "%";
    fill.style.background = bosses[0].color;
  }
  var horn = document.getElementById("btn-horn");
  var ready = G.hornT <= 0 && !G.paused && !G.ending;
  horn.disabled = !ready;
  horn.classList.toggle("ready", ready);
  document.getElementById("horn-label").textContent = G.hornT > 0 ? Math.ceil(G.hornT) + " с" : "Готов";
  var b = document.getElementById("banner");
  if (G.banner) {
    b.hidden = false;
    b.querySelector("strong").textContent = G.banner.text;
    b.querySelector("span").textContent = G.banner.sub || "";
  } else b.hidden = true;
  var toast = document.getElementById("toast");
  if (G.toast) { toast.hidden = false; paintLine(toast, G.toast.text); }
  else toast.hidden = true;
  document.getElementById("pause-veil").hidden = !G.paused;
  document.getElementById("btn-pause").textContent = G.paused ? "Дальше" : "Пауза";
}

function arm(id) {
  G.sellArm = false;
  G.sel = null;
  G.arm = G.arm === id ? null : id;
  AudioBus.sfx("click");
  sync();
}
function disarm() {
  G.arm = null;
  G.sel = null;
  G.sellArm = false;
  if (G.screen === "play") sync();
}
function worldPos(e) {
  var r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
}
function cellOf(x, y) {
  var cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return null;
  return [cx, cy];
}
function onMove(e) {
  var p = worldPos(e);
  G.mouse.x = p.x;
  G.mouse.y = p.y;
  G.mouse.inside = true;
  G.mouse.cell = cellOf(p.x, p.y);
}
function onDown(e) {
  if (G.screen !== "play" || G.ending) return;
  if (e.button === 2) { disarm(); return; }
  var p = worldPos(e);
  var cell = cellOf(p.x, p.y);
  if (!cell) return;
  var tower = towerAt(cell[0], cell[1]);
  if (tower) {
    G.sel = tower.id;
    G.arm = null;
    G.sellArm = false;
    AudioBus.sfx("click");
    sync();
    return;
  }
  if (G.arm) tryBuild(cell[0], cell[1]);
  else { G.sel = null; G.sellArm = false; sync(); }
}
function terrainFree(cx, cy) {
  var k = cx + "," + cy;
  return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && !G.map.pathSet.has(k) && !G.map.forest.has(k) && !G.map.ponds.has(k);
}
function towerAt(cx, cy) {
  for (var i = 0; i < G.towers.length; i++) if (G.towers[i].cx === cx && G.towers[i].cy === cy) return G.towers[i];
  return null;
}
function tryBuild(cx, cy) {
  var def = Campaign.TOWERS[G.arm];
  if (!def) return;
  if (!terrainFree(cx, cy)) {
    G.toast = { text: "Сюда нельзя — только свободная трава.", life: 1.3 };
    AudioBus.sfx("click");
    return;
  }
  if (G.gold < def.cost) {
    G.toast = { text: "Не хватает золота.", life: 1.2 };
    AudioBus.sfx("click");
    return;
  }
  G.gold -= def.cost;
  G.towers.push(makeTower(G.arm, cx, cy));
  AudioBus.sfx("place");
  burst((cx + 0.5) * CELL, (cy + 0.5) * CELL, "#ffe08a", 10);
  sync();
}
function makeTower(type, cx, cy) {
  var t = {
    id: ++SEQ, type: type, cx: cx, cy: cy,
    x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL,
    lv: 1, cd: 0, slowT: 0, hasteT: 0, freezeT: 0, recoil: 0,
    birds: [], items: [], mines: [], spinT: 0, ultT: 0, casts: 0
  };
  if (Campaign.TOWERS[type].attack === "birds") t.birds.push(makeBird(t, 0));
  return t;
}
function makeBird(t, i) {
  return { x: t.x, y: t.y - 26, state: "idle", cool: 0.15 + i * 0.25, targetId: 0, tx: t.x, ty: t.y, hit: false, flap: Math.random() * 6, flip: 1 };
}
function selectedTower() {
  for (var i = 0; i < G.towers.length; i++) if (G.towers[i].id === G.sel) return G.towers[i];
  return null;
}
function stats(t) { return Campaign.TOWERS[t.type].levels[t.lv - 1]; }
function refundOf(t) {
  var def = Campaign.TOWERS[t.type];
  var spent = def.cost;
  for (var i = 1; i < t.lv; i++) spent += def.up[i - 1];
  for (i = 0; i < t.items.length; i++) spent += Campaign.ITEMS[t.items[i]].cost;
  return Math.round(spent * 0.6);
}
function hasItem(t, id) { return t.items.indexOf(id) >= 0; }
function cdOf(t) {
  var cd = stats(t).cd;
  if (hasItem(t, "boots")) cd *= 0.72;
  return cd;
}
function dmgOf(t, base) {
  return hasItem(t, "crystal") ? base * 1.35 : base;
}
function renderItems(tower) {
  var row = document.getElementById("item-row");
  var box = document.getElementById("items");
  if (!box || !row) return;
  var opened = !!tower;
  var changed = row.hidden === opened;
  box.innerHTML = "";
  row.hidden = !opened;
  if (changed) requestAnimationFrame(fit);
  if (!tower) return;
  Campaign.ITEM_ORDER.forEach(function (id) {
    var it = Campaign.ITEMS[id];
    var owned = tower.items.indexOf(id) >= 0;
    var full = tower.items.length >= 3 && !owned;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "item-btn";
    b.classList.toggle("on", G.itemPick === id);
    b.classList.toggle("poor", !owned && G.gold < it.cost);
    b.title = it.blurb + (full ? " Слоты заняты." : "");
    var img = document.createElement("img");
    img.src = "assets/icons/items/" + id + ".png";
    img.alt = "";
    var label = document.createElement("span");
    label.textContent = owned ? it.name + " ✓" : it.name + " · " + it.cost;
    b.appendChild(img);
    b.appendChild(label);
    b.addEventListener("click", function () {
      G.itemPick = id;
      AudioBus.sfx("click");
      sync();
    });
    box.appendChild(b);
  });
}
function renderItemCard(tower) {
  var card = document.getElementById("item-card");
  var main = document.getElementById("play-main");
  var it = G.itemPick && Campaign.ITEMS[G.itemPick];
  var show = !!(tower && it);
  var was = !card.hidden;
  card.hidden = !show;
  if (main) main.classList.toggle("has-item", show);
  if (was !== show) requestAnimationFrame(fit);
  if (!show) return;
  var owned = tower.items.indexOf(G.itemPick) >= 0;
  var full = tower.items.length >= 3 && !owned;
  document.getElementById("item-card-img").src = "assets/icons/items/" + G.itemPick + ".jpg";
  document.getElementById("item-card-img").alt = it.name;
  document.getElementById("item-card-name").textContent = it.name;
  var cost = document.getElementById("item-card-cost");
  paintLine(cost, it.cost + " золота");
  cost.classList.toggle("danger", !owned && G.gold < it.cost);
  document.getElementById("item-card-slots").textContent = owned ? "Уже надета" : "Слоты " + tower.items.length + " / 3";
  document.getElementById("item-card-text").textContent = it.blurb;
  var list = document.getElementById("item-card-stats");
  list.innerHTML = "";
  (it.stats || []).forEach(function (line) {
    var li = document.createElement("li");
    li.textContent = line;
    list.appendChild(li);
  });
  var btn = document.getElementById("btn-equip");
  btn.disabled = owned || full || G.gold < it.cost;
  btn.textContent = owned ? "Надета" : full ? "Слоты заняты" : "Надеть";
}
function buyItem(towerId, itemId) {
  var t = null;
  for (var i = 0; i < G.towers.length; i++) if (G.towers[i].id === towerId) t = G.towers[i];
  var it = Campaign.ITEMS[itemId];
  if (!t || !it || t.items.indexOf(itemId) >= 0) return;
  if (t.items.length >= 3) { G.toast = { text: "Только три вещи на героя.", life: 1.2 }; return; }
  if (G.gold < it.cost) { G.toast = { text: "Не хватает золота на вещь.", life: 1.2 }; return; }
  G.gold -= it.cost;
  t.items.push(itemId);
  AudioBus.sfx("upgrade");
  G.toast = { text: it.name + ". " + it.blurb, life: 1.4 };
  sync();
}
function upgradeSel() {
  var t = selectedTower();
  if (!t || t.lv >= 3) return;
  var cost = Campaign.TOWERS[t.type].up[t.lv - 1];
  if (G.gold < cost) { G.toast = { text: "Не хватает золота на улучшение.", life: 1.2 }; return; }
  G.gold -= cost;
  t.lv++;
  if (Campaign.TOWERS[t.type].attack === "birds") {
    while (t.birds.length < stats(t).birds) t.birds.push(makeBird(t, t.birds.length));
  }
  AudioBus.sfx("upgrade");
  burst(t.x, t.y - 10, "#fff1b8", 12);
  sync();
}
function sellSel() {
  var t = selectedTower();
  if (!t) return;
  if (!G.sellArm) { G.sellArm = true; sync(); return; }
  var refund = refundOf(t);
  G.gold += refund;
  G.towers = G.towers.filter(function (x) { return x.id !== t.id; });
  G.sel = null;
  G.sellArm = false;
  AudioBus.sfx("sell");
  G.toast = { text: "Герой ушёл в таверну · +" + refund, life: 1.2 };
  sync();
}

function beginWave() {
  if (G.screen !== "play" || G.running || G.ending) return;
  if (G.wave >= G.level.waves.length) return;
  var bonus = Math.round(8 * G.diff.reward);
  G.gold += bonus;
  var wave = G.level.waves[G.wave];
  G.plan = [];
  var t = 0.3;
  wave.groups.forEach(function (grp) {
    t += grp.delay || 0;
    var every = (grp.every || 0.9) * G.diff.gap;
    for (var i = 0; i < grp.count; i++) {
      G.plan.push({ t: t, type: grp.type });
      t += every;
    }
  });
  G.planI = 0;
  G.spawnT = 0;
  G.running = true;
  G.banner = { text: "Волна " + (G.wave + 1), sub: preview(wave), life: 1.7 };
  AudioBus.sfx("wave");
  sync();
}
function spawnEnemy(type, dist, opt) {
  opt = opt || {};
  var def = Campaign.ENEMIES[type];
  if (!def || !G.map) return null;
  var waveScale = def.boss ? 1 : (1 + G.wave * 0.045);
  var hp = Math.max(1, Math.round(def.hp * G.diff.hp * G.level.hp * waveScale * (opt.hpMul || 1)));
  var pos = sample(G.map, Math.max(0, dist));
  var e = {
    id: ++SEQ, type: type, name: def.name, hp: hp, maxHp: hp, speed: def.speed,
    armor: def.armor, gold: opt.summoned ? 2 : def.gold, leak: def.leak || 1,
    scale: def.scale || 1, undead: !!def.undead, flying: !!def.flying, boss: !!def.boss,
    color: def.color || "#fff", pierceMul: def.pierceMul || 0, magicMul: def.magicMul || 0,
    ai: def.ai || "", intro: def.intro || "", dist: Math.max(0, dist), x: pos.x, y: pos.y,
    flip: 1, lane: Math.random() * 16 - 8, alive: true, fade: 0, flash: 0, slow: 0, slowT: 0,
    shieldT: 0, chargeT: 0, aiT: def.boss ? 6 : 0, aiN: 0, warned: false, phase: 1,
    iceArmor: false, enraged: false, split: false, summoned: !!opt.summoned,
    burrowT: 0, guarded: false, heals: def.heals || ""
  };
  G.enemies.push(e);
  if (def.boss) {
    AudioBus.sfx("roar");
    G.shake = Math.max(G.shake, REDUCE ? 0 : 8);
    if (!opt.quiet) G.banner = { text: def.name, sub: def.intro, life: 2.8 };
  } else if (!opt.summoned && Campaign.TIPS[type] && !G.seen[type]) {
    G.seen[type] = 1;
    G.toast = { text: Campaign.TIPS[type], life: 3.2 };
  }
  return e;
}
function enemyById(id) {
  for (var i = 0; i < G.enemies.length; i++) if (G.enemies[i].id === id) return G.enemies[i];
  return null;
}

function update(dt) {
  if (G.paused) return;
  G.time += dt;
  if (G.ending) {
    G.endT -= dt;
    if (G.ending === "win" && Math.random() < 0.45) firework();
    updateFx(dt);
    if (G.endT <= 0) showResult();
    return;
  }
  if (G.hornT > 0) G.hornT -= dt;
  if (G.running && G.plan) {
    G.spawnT += dt;
    while (G.planI < G.plan.length && G.plan[G.planI].t <= G.spawnT) {
      spawnEnemy(G.plan[G.planI].type, 0);
      G.planI++;
    }
  }
  var list = G.enemies.slice();
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (!e.alive) { e.fade -= dt; continue; }
    e.slowT -= dt;
    e.shieldT -= dt;
    if (e.breakT > 0) e.breakT -= dt;
    e.chargeT -= dt;
    e.flash = Math.max(0, e.flash - dt);
    var sp = e.speed * G.diff.spd;
    if (e.enraged) sp *= 1.25;
    if (e.slowT > 0) {
      var slow = e.slow;
      if (e.chargeT > 0 && e.ai === "butcher") slow *= 0.45;
      sp *= (1 - slow);
    }
    if (e.chargeT > 0) sp *= e.ai === "butcher" ? 3.1 : 2.45;
    if (e.burrowT > 0) sp = 0;
    e.dist += sp * dt;
    var pos = sample(G.map, e.dist);
    var ln = Math.hypot(pos.dx, pos.dy) || 1;
    e.x = pos.x + (-pos.dy / ln) * e.lane;
    e.y = pos.y + (pos.dx / ln) * e.lane;
    e.flip = pos.dx < -0.2 ? -1 : 1;
    if (e.chargeT > 0 && Math.random() < 0.55) burst(e.x, e.y, "#e6d8c4", 1);
    if (e.dist >= G.map.total) { leakEnemy(e); continue; }
    runAi(e, dt);
    if (G.ending) break;
  }
  for (i = 0; i < G.enemies.length; i++) {
    e = G.enemies[i];
    if (!e.alive || e.type !== "frost") continue;
    for (var ti = 0; ti < G.towers.length; ti++) {
      if (Math.hypot(G.towers[ti].x - e.x, G.towers[ti].y - e.y) < 112) G.towers[ti].slowT = 0.4;
    }
  }
  for (ti = 0; ti < G.towers.length; ti++) updateTower(G.towers[ti], dt);
  updateShots(dt);
  G.enemies = G.enemies.filter(function (en) { return en.alive || en.fade > 0; });
  if (!G.ending) checkClear();
  var bossUp = G.enemies.some(function (en) { return en.alive && en.boss; });
  AudioBus.setMode(bossUp ? "boss" : "battle");
  updateFx(dt);
}
function leakEnemy(e) {
  if (!e.alive) return;
  e.alive = false;
  e.fade = 0.35;
  G.combo = 0;
  if (G.ending === "lose") return;
  var n = e.leak || 1;
  G.lives = Math.max(0, G.lives - n);
  AudioBus.sfx("leak");
  G.shake = Math.max(G.shake, REDUCE ? 0 : 5);
  G.toast = { text: (e.boss ? e.name + " прорвался" : "Прорвались") + "  −" + n, life: 1.5 };
  sync();
  if (e.boss || G.lives <= 0) beginEnding("lose", e.boss ? e.name + " прорвался к воротам" : "");
}
function runAi(e, dt) {
  if (e.ai === "dread") {
    e.aiT -= dt;
    if (e.aiT <= 0) {
      e.aiN++;
      if (e.aiN % 2) {
        e.flying = false;
        e.pierceMul = 0.45;
        e.magicMul = 1.3;
        spawnEnemy("ghoul", Math.max(0, e.dist - 16), { summoned: true });
        spawnEnemy("ghoul", Math.max(0, e.dist - 38), { summoned: true });
        spawnEnemy("ghoul", Math.max(0, e.dist - 60), { summoned: true });
        G.toast = { text: "Сел на тропу. Стрелы слабые — вихрь и молния", life: 1.6 };
      } else {
        e.flying = true;
        e.pierceMul = 0;
        e.magicMul = 0;
        e.shieldT = 2.6;
        AudioBus.sfx("shield");
        G.toast = { text: "Взмыл! Вихрь мимо. Щит слабый — бей стрелами", life: 1.6 };
      }
      e.aiT = 8;
    }
  } else if (e.ai === "butcher") {
    e.aiT -= dt;
    if (!e.warned && e.aiT < 1.15 && e.aiT > 0) {
      e.warned = true;
      G.toast = { text: "Мясник разгоняется! Тормози, пока не рванул", life: 1.2 };
    }
    if (e.aiT <= 0) {
      e.chargeT = 1.8;
      e.warned = false;
      e.aiT = 10;
      AudioBus.sfx("roar");
    }
    if (!e.split && e.hp / e.maxHp < 0.55) {
      e.split = true;
      for (var w = 0; w < 6; w++) spawnEnemy("wolf", Math.max(0, e.dist - 12 - w * 22), { summoned: true });
      G.banner = { text: "Стая", sub: "Волки рвутся к воротам. В разгоне Мясник почти не чувствует ударов.", life: 2.4 };
    }
  } else if (e.ai === "burrow") {
    e.burrowT = Math.max(0, e.burrowT - dt);
    var bugs = G.enemies.some(function (en) { return en.alive && en.type === "scarab"; });
    if (e.guarded !== bugs) {
      e.guarded = bugs;
      if (bugs) G.toast = { text: "Пока жуки живы, панцирь почти не берётся", life: 1.5 };
    }
    if (e.burrowT > 0) return;
    e.aiT -= dt;
    if (!e.warned && e.aiT < 1.15 && e.aiT > 0) {
      e.warned = true;
      G.toast = { text: "Ануб'арак зарывается!", life: 1.1 };
    }
    if (e.aiT <= 0) {
      e.warned = false;
      e.burrowT = 2.3;
      var room = G.map.total - 120 - e.dist;
      var jump = Math.max(0, Math.min(170, room));
      if (jump < 48) jump = 0;
      e.dist += jump;
      var pop = sample(G.map, e.dist);
      e.x = pop.x;
      e.y = pop.y;
      for (var b = 0; b < 5; b++) spawnEnemy("scarab", Math.max(0, e.dist - jump - 8 - b * 16), { summoned: true });
      e.aiT = 9;
      AudioBus.sfx("roar");
      burst(e.x, e.y, "#a08050", 10);
      G.toast = { text: jump ? "Вылез дальше по тропе. Жуки — сзади" : "Зарылся на месте. Сними жуков", life: 1.6 };
    }
  } else if (e.ai === "kel") {
    e.aiT -= dt;
    if (e.hp / e.maxHp < 0.5 && !e.split) {
      e.split = true;
      for (var s = 0; s < 4; s++) spawnEnemy("skeleton", Math.max(0, e.dist - 24 - s * 16), { summoned: true });
      G.banner = { text: "Кел'Тузед", sub: "Он поднимает скелетов", life: 1.8 };
    }
    if (!e.warned && e.aiT < 0.75 && e.aiT > 0) {
      e.warned = true;
      G.toast = { text: "Сейчас будет мороз!", life: 0.8 };
    }
    if (e.aiT <= 0) {
      e.warned = false;
      e.aiT = 10;
      frostPulse(e.x, e.y, 168, 3.2);
    }
  } else if (e.ai === "lich") {
    var pct = e.hp / e.maxHp;
    if (pct < 0.66 && e.phase < 2) {
      e.phase = 2;
      e.iceArmor = true;
      spawnEnemy("wyrm", Math.max(0, e.dist - 90), { quiet: true });
      spawnEnemy("wail", Math.max(0, e.dist - 36), { quiet: true });
      G.banner = { text: "Лёд на броне", sub: "Стрелы слабее. Змей в небе. Голос трона лечит короля — банши бей молнией.", life: 3.4 };
      G.toast = { text: "Ледяной змей! Вихрь и мины его не берут.", life: 2.2 };
    }
    if (pct < 0.33 && e.phase < 3) {
      e.phase = 3;
      e.enraged = true;
      e.aiT = 1.6;
      G.banner = { text: "Ярость трона", sub: "Скоро мороз по всем героям. Жми рог!", life: 2.6 };
    }
    e.aiT -= dt;
    if (e.phase >= 3) {
      if (!e.warned && e.aiT < 1 && e.aiT > 0) {
        e.warned = true;
        G.toast = { text: "Мороз по героям!", life: 1 };
      }
      if (e.aiT <= 0) {
        e.warned = false;
        e.aiT = 9;
        for (var i = 0; i < G.towers.length; i++) G.towers[i].freezeT = Math.max(G.towers[i].freezeT, 1.45);
        AudioBus.sfx("freeze");
        G.fx.push({ kind: "flash", age: 0, life: 0.28, color: "rgba(198,236,255,.45)" });
      }
    } else if (e.aiT <= 0) {
      spawnEnemy("ghoul", Math.max(0, e.dist - 16), { summoned: true });
      spawnEnemy("skeleton", Math.max(0, e.dist - 36), { summoned: true });
      e.aiT = 10;
    }
    var heal = false;
    for (var h = 0; h < G.enemies.length; h++) {
      if (G.enemies[h].alive && G.enemies[h].heals === "lich") heal = true;
    }
    if (heal && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
      e.healShow = (e.healShow || 0) - dt;
      if (e.healShow <= 0) {
        e.healShow = 0.85;
        floatText(e.x, e.y - 52, "+", "#8ee0a8");
      }
    }
  }
}
function frostPulse(x, y, r, dur) {
  for (var i = 0; i < G.towers.length; i++) {
    if (Math.hypot(G.towers[i].x - x, G.towers[i].y - y) < r) G.towers[i].slowT = Math.max(G.towers[i].slowT, dur);
  }
  G.fx.push({ kind: "ring", x: x, y: y, age: 0, life: 0.5, r: r, color: "#9fd7ff" });
  AudioBus.sfx("freeze");
}
function checkClear() {
  if (!G.running || G.ending) return;
  if (G.planI < G.plan.length) return;
  if (G.enemies.some(function (e) { return e.alive; })) return;
  var bonus = Math.round((G.level.waves[G.wave].bonus || 24) * G.diff.reward * 0.82);
  G.gold += bonus;
  floatText(480, 120, "+" + bonus, "#ffd56a");
  G.wave++;
  G.running = false;
  AudioBus.sfx("coin");
  if (G.wave >= G.level.waves.length) beginEnding("win");
  else G.toast = { text: "Волна отбита! +" + bonus + " золота", life: 1.6 };
  sync();
}
function beginEnding(kind, sub) {
  if (G.ending) return;
  G.ending = kind;
  G.endT = kind === "win" ? 1.7 : 1.15;
  G.running = false;
  if (kind === "win") {
    AudioBus.sfx("victory");
    var prev = SAVE.best[G.level.id];
    var rank = function (id) { return id ? Campaign.DIFF[id].rank : 0; };
    if (rank(G.diff.id) > rank(prev)) SAVE.best[G.level.id] = G.diff.id;
    persist();
    G.banner = { text: "Победа!", sub: G.level.name, life: 2 };
  } else {
    AudioBus.sfx("defeat");
    G.banner = { text: "Застава пала", sub: sub || "Соберёмся и попробуем снова", life: 2 };
  }
}
function showResult() {
  if (G.screen === "result") return;
  var win = G.ending === "win";
  var lv = G.level;
  var beat, fig;
  if (win) { beat = lv.after; fig = lv.after.fig; }
  else {
    fig = "guard";
    beat = {
      who: "Капитан стражи",
      text: "Мы отступили на шаг и не сбежали, так что дорога ещё наша, если вернуться, пока живые не остались на ней одни.",
      tip: (lv.before && lv.before.tip) || ""
    };
  }
  G.resultFig = fig;
  document.getElementById("result-kicker").textContent = win ? "Глава " + lv.id + " удержана" : "Глава " + lv.id;
  document.getElementById("result-title").textContent = win ? lv.name : "Нас оттеснили";
  showTalk("result", beat, win ? SCENE[lv.id].after : ["you", "captain"]);
  var rank = win ? Campaign.DIFF[G.diff.id].rank : 0;
  document.getElementById("result-stars").textContent = (win ? "★★★☆☆☆".slice(3 - rank, 6 - rank) + "  " + Campaign.DIFF[G.diff.id].name : "☆☆☆");
  var next = document.getElementById("result-next");
  next.hidden = !win;
  next.textContent = lv.id < Campaign.LEVELS.length ? "Дальше" : "В лагерь";
  showScreen("result");
  AudioBus.setMode("menu");
}

function rateMul(t) {
  var m = 1;
  if (t.hasteT > 0) m *= 1.55;
  if (t.slowT > 0) m *= 0.68;
  return m;
}
function updateTower(t, dt) {
  var def = Campaign.TOWERS[t.type];
  t.slowT = Math.max(0, t.slowT - dt);
  t.hasteT = Math.max(0, t.hasteT - dt);
  t.freezeT = Math.max(0, t.freezeT - dt);
  t.recoil = Math.max(0, t.recoil - dt * 4);
  t.spinT = Math.max(0, (t.spinT || 0) - dt);
  t.ultT = Math.max(0, (t.ultT || 0) - dt);
  if (hasItem(t, "radiance")) auraBurn(t, dt);
  if (def.attack === "hook") rotTick(t, dt);
  if (def.attack === "mine") mineTick(t, dt);
  if (t.freezeT > 0) return;
  if (def.attack === "birds") updateBirds(t, dt);
  else updateGun(t, dt);
}
function updateGun(t, dt) {
  t.cd -= dt * rateMul(t);
  if (t.cd > 0) return;
  var target = pickTarget(t);
  if (!target) { t.cd = 0; return; }
  fire(t, target);
  t.cd += cdOf(t);
  if (t.cd < 0) t.cd = 0;
  t.recoil = 1;
}
function pickTarget(t) {
  var range = stats(t).range;
  var best = null, sc = -1;
  for (var i = 0; i < G.enemies.length; i++) {
    var e = G.enemies[i];
    if (!inRange(t, e, range)) continue;
    var s = e.dist + (e.boss ? 170 : 0);
    if (s > sc) { sc = s; best = e; }
  }
  return best;
}
function inRange(t, e, range) {
  if (!e.alive || e.burrowT > 0) return false;
  if (Campaign.TOWERS[t.type].air === "no" && e.flying) return false;
  var ey = e.y - (e.flying ? 26 : 0);
  return Math.hypot(t.x - e.x, t.y - ey) <= range + 6;
}
function fire(t, target) {
  var def = Campaign.TOWERS[t.type];
  var st = stats(t);
  var kind = def.attack;
  var dmg = dmgOf(t, st.dmg);
  castMark(t);
  if (kind === "spin" || kind === "call" || kind === "pulse" || kind === "scream") {
    blast(t, t.x, t.y, st.splash || st.range, dmg, def, {
      slow: st.slow || 0, pct: st.pct || 0, air: def.air === "yes", stop: kind === "call"
    });
    if (kind === "spin") t.spinT = 0.4;
    if (kind === "scream") {
      t.casts = (t.casts || 0) + 1;
      if (t.casts % 3 === 0) shootLine(t, target, dmg * 1.65, 4);
    }
    AudioBus.sfx(kind === "spin" || kind === "call" ? "cannon" : "holy");
    return;
  }
  if (kind === "nova") {
    blast(t, target.x, target.y, st.splash, dmg, def, { slow: st.slow || 0.3, air: true });
    AudioBus.sfx("holy");
    return;
  }
  if (kind === "chain") {
    var list = chainFrom(target, st.bounces || 2);
    var pts = [{ x: t.x, y: t.y - 20 }];
    var fall = [1, 0.78, 0.62, 0.5, 0.42];
    for (var i = 0; i < list.length; i++) {
      deal(list[i], dmg * (fall[i] || 0.4), def, { tower: t });
      if (list[i].alive && st.slow) { list[i].slow = Math.max(list[i].slow, st.slow); list[i].slowT = Math.max(list[i].slowT, 2); }
      pts.push({ x: list[i].x, y: list[i].y - (list[i].flying ? 30 : 16) });
      sparks(list[i].x, list[i].y - 12, t.type === "frostlich" ? "#d7f4ff" : "#ffe7a8", 5, 80, 0.22);
    }
    G.fx.push({ kind: "zap", pts: pts, age: 0, life: 0.42, ice: t.type === "frostlich" });
    pushFx({ kind: "nova", x: t.x, y: t.y - 18, r: 24, life: 0.16, rgb: t.type === "frostlich" ? "180,230,255" : "255,226,140" });
    AudioBus.sfx("holy");
    return;
  }
  if (kind === "line") { shootLine(t, target, dmg, st.pierce || 1); AudioBus.sfx("ballista"); return; }
  if (kind === "hook") { shootArrow(t, target, dmg, 0.45); AudioBus.sfx("arrow"); return; }
  if (kind === "mine") { plantMine(t); AudioBus.sfx("place"); return; }
  if (kind === "ravage") {
    shootBomb(t, target, dmg, st.splash);
    if ((t.ultT || 0) <= 0) {
      t.ultT = st.ultCd || 8;
      blast(t, t.x, t.y, st.ultR || 180, dmgOf(t, st.ult || 80), def, { slow: 0.9, air: true, stop: true });
      G.banner = { text: "Реведж!", sub: "Волна Тайдхантера", life: 1.2 };
      AudioBus.sfx("horn");
    }
    return;
  }
  if (kind === "stacks") {
    target.fury = target.fury || {};
    var n = target.fury[t.id] || 0;
    target.fury[t.id] = Math.min(8, n + 1);
    shootArrow(t, target, dmg * (1 + 0.55 * n), 0);
    AudioBus.sfx("arrow");
    return;
  }
  var volley = st.shots || 1;
  for (var s = 0; s < volley; s++) shootArrow(t, target, dmg, 0, s);
  AudioBus.sfx("arrow");
}
function arrowStyle(type) {
  if (type === "drow") return "frost";
  if (type === "sniper") return "bullet";
  if (type === "ursa") return "claw";
  if (type === "pudge") return "hook";
  return "bolt";
}
function arrowSpeed(style) {
  if (style === "bullet") return 1040;
  if (style === "claw") return 860;
  if (style === "hook") return 640;
  if (style === "frost") return 580;
  return 540;
}
function shootArrow(t, target, dmg, slow, i) {
  i = i || 0;
  var style = arrowStyle(t.type);
  var x = t.x + (i ? 8 : -4), y = t.y - 20;
  G.shots.push({
    kind: "arrow", style: style, from: t.type, tid: t.id,
    x: x, y: y, ox: t.x, oy: t.y - 10,
    targetId: target.id, tx: target.x, ty: target.y, speed: arrowSpeed(style),
    dmg: dmg, slow: slow || 0, alive: true, delay: i * 0.07, age: 0, trail: [], ang: 0
  });
  if (style === "bullet") pushFx({ kind: "nova", x: x, y: y, r: 18, life: 0.1, rgb: "255,220,140" });
  if (style === "frost") pushFx({ kind: "nova", x: x, y: y, r: 14, life: 0.14, rgb: "186,230,255" });
}
function shootLine(t, target, dmg, hits) {
  var st = stats(t);
  var ty = target.y - (target.flying ? 26 : 8);
  var ang = Math.atan2(ty - (t.y - 12), target.x - t.x);
  var sonic = t.type === "qop";
  G.shots.push({
    kind: "bolt", style: sonic ? "sonic" : "power", from: t.type, tid: t.id,
    x: t.x, y: t.y - 12, px: t.x, py: t.y - 12,
    dx: Math.cos(ang), dy: Math.sin(ang), left: st.range + 40,
    speed: sonic ? 760 : 1180,
    hits: {}, hitN: 0, maxHits: hits, dmg: dmg, alive: true, trail: []
  });
  pushFx({ kind: "nova", x: t.x, y: t.y - 12, r: 22, life: 0.14, rgb: sonic ? "236,160,255" : "180,255,200" });
}
function shootBomb(t, target, dmg, splash) {
  G.shots.push({
    kind: "bomb", style: "anchor", from: t.type, tid: t.id, x: t.x, y: t.y - 8, sx: t.x, sy: t.y - 8,
    targetId: target.id, t: 0, dur: 0.38, dmg: dmg, splash: splash, alive: true, trail: []
  });
  AudioBus.sfx("cannon");
}
function blast(t, x, y, radius, dmg, def, opt) {
  opt = opt || {};
  flourish(t, opt.fx || def.attack, x, y, radius);
  for (var i = 0; i < G.enemies.length; i++) {
    var e = G.enemies[i];
    if (!e.alive || e.burrowT > 0) continue;
    if (!opt.air && e.flying) continue;
    var ey = e.y - (e.flying ? 26 : 0);
    if (Math.hypot(e.x - x, ey - y) > radius) continue;
    deal(e, dmg + (opt.pct ? e.maxHp * opt.pct : 0), def, { tower: t });
    if (e.alive && opt.slow) {
      e.slow = Math.max(e.slow, opt.slow);
      e.slowT = Math.max(e.slowT, opt.stop ? 1.35 : 2);
    }
  }
}
function pathPointNear(t) {
  var poly = G.map.poly, best = poly[1] || poly[0], bd = 1e9;
  for (var i = 1; i < poly.length; i++) {
    var d = Math.hypot(poly[i].x - t.x, poly[i].y - t.y);
    if (d < bd) { bd = d; best = poly[i]; }
  }
  return best;
}
function plantMine(t) {
  var spot = pathPointNear(t);
  var jitter = (t.mines.length % 3 - 1) * 14;
  t.mines.push({ x: spot.x + jitter, y: spot.y, life: 9 });
  if (t.mines.length > 4) t.mines.shift();
  pushFx({ kind: "nova", x: spot.x + jitter, y: spot.y, r: 16, life: 0.18, rgb: "255,90,50" });
}
function mineTick(t, dt) {
  var st = stats(t);
  var def = Campaign.TOWERS[t.type];
  for (var i = t.mines.length - 1; i >= 0; i--) {
    var m = t.mines[i];
    m.life -= dt;
    var hit = null;
    for (var k = 0; k < G.enemies.length; k++) {
      var e = G.enemies[k];
      if (!e.alive || e.flying) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) < 28) { hit = e; break; }
    }
    if (hit || m.life <= 0) {
      if (hit) blast(t, m.x, m.y, st.splash, dmgOf(t, st.dmg), def, { air: false });
      t.mines.splice(i, 1);
      if (hit) AudioBus.sfx("cannon");
    }
  }
}
function rotTick(t, dt) {
  t.auraT = (t.auraT || 0) - dt;
  if (t.auraT > 0) return;
  t.auraT = 0.45;
  var st = stats(t);
  var def = Campaign.TOWERS[t.type];
  var r = st.splash || 96;
  var any = false;
  for (var i = 0; i < G.enemies.length; i++) {
    var e = G.enemies[i];
    if (!e.alive || e.flying) continue;
    if (Math.hypot(e.x - t.x, e.y - t.y) < r) {
      deal(e, dmgOf(t, st.rot || 8), def, { tower: t, bare: true });
      any = true;
    }
  }
  if (any) sparks(t.x, t.y - 6, "#b6dc62", 4, 28, 0.3);
}
function auraBurn(t, dt) {
  t.radT = (t.radT || 0) - dt;
  if (t.radT > 0) return;
  t.radT = 0.5;
  var def = { role: "magic" };
  var any = false;
  for (var i = 0; i < G.enemies.length; i++) {
    var e = G.enemies[i];
    if (!e.alive || e.burrowT > 0) continue;
    var ey = e.y - (e.flying ? 26 : 0);
    if (Math.hypot(e.x - t.x, ey - t.y) < 108) {
      deal(e, 11, def, { bare: true });
      any = true;
    }
  }
  if (any && !REDUCE) sparks(t.x, t.y - 8, "#ffc85a", 3, 24, 0.25);
}
function chainFrom(first, n) {
  var list = [first], cur = first;
  for (var i = 1; i < n; i++) {
    var best = null, bd = 96;
    for (var k = 0; k < G.enemies.length; k++) {
      var e = G.enemies[k];
      if (!e.alive || list.indexOf(e) >= 0) continue;
      var d = Math.hypot(e.x - cur.x, e.y - cur.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) break;
    list.push(best);
    cur = best;
  }
  return list;
}
function deal(e, amount, def, opt) {
  opt = opt || {};
  if (!e || !e.alive || !def || e.burrowT > 0) return;
  var m = Campaign.MATRIX[def.role][e.armor] || 1;
  if (def.holy && e.undead) m *= 1.35;
  if (def.airBonus && e.flying) m *= def.airBonus;
  if (def.bossBonus && e.boss) m *= def.bossBonus;
  if (e.pierceMul && def.role === "pierce") m *= e.pierceMul;
  if (e.magicMul && def.role === "magic") m *= e.magicMul;
  if (e.iceArmor && def.role === "pierce") m *= 0.6;
  if (e.chargeT > 0 && e.ai === "butcher") m *= 0.4;
  if (e.guarded) m *= 0.38;
  else if (e.shieldT > 0) m *= 0.42;
  if (e.breakT > 0) m *= 1.28;
  var dmg = Math.max(1, Math.round(amount * m));
  e.hp -= dmg;
  e.flash = 0.16;
  floatText(e.x, e.y - 36, String(dmg), def.role === "magic" ? "#ffe08a" : "#fff");
  if (!opt.bare && opt.tower) onHit(opt.tower, e, dmg, def);
  if (e.hp <= 0) killEnemy(e);
}
function onHit(t, e, dmg, def) {
  if (hasItem(t, "skadi") && e.hp > 0) { e.slow = Math.max(e.slow, 0.34); e.slowT = Math.max(e.slowT, 1.5); }
  if (hasItem(t, "deso")) e.breakT = 2.6;
  if (t._extra) return;
  var single = def.attack === "arrow" || def.attack === "stacks" || def.attack === "hook" || def.attack === "birds" || def.attack === "line";
  t._extra = 1;
  if (hasItem(t, "bfury") && single) {
    for (var i = 0; i < G.enemies.length; i++) {
      var o = G.enemies[i];
      if (!o.alive || o === e || o.flying) continue;
      if (Math.hypot(o.x - e.x, o.y - e.y) < 58) deal(o, dmg * 0.5, def, { tower: t, bare: true });
    }
    pushFx({ kind: "nova", x: e.x, y: e.y, r: 58, life: 0.22, rgb: "255,170,70" });
  }
  if (hasItem(t, "mael") && single && Math.random() < 0.3) {
    var hops = chainFrom(e, 3).slice(1);
    var pts = [{ x: e.x, y: e.y - 12 }];
    for (var h = 0; h < hops.length; h++) {
      deal(hops[h], dmg * 0.45, { role: "magic" }, { bare: true });
      pts.push({ x: hops[h].x, y: hops[h].y - 12 });
    }
    if (hops.length) G.fx.push({ kind: "zap", pts: pts, age: 0, life: 0.18 });
  }
  t._extra = 0;
}
function rawHit(e, dmg) {
  if (!e.alive || e.burrowT > 0) return;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.2;
  floatText(e.x, e.y - 36, String(dmg), "#ffe08a");
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (!e.alive) return;
  e.alive = false;
  e.fade = 0.5;
  var g = Math.round((e.gold || 0) * G.diff.reward);
  if (g > 0) { G.gold += g; floatText(e.x, e.y - 16, "+" + g, "#ffd56a"); }
  G.combo++;
  if (G.combo === 12 || G.combo === 30) {
    G.gold += 12;
    G.toast = { text: G.combo >= 30 ? "Герой Лордерона! +12" : "Так держать! +12", life: 1.4 };
    AudioBus.sfx("praise");
  }
  AudioBus.sfx(e.boss ? "roar" : "dead");
  burst(e.x, e.y - 10, e.color, e.boss ? 26 : 10);
  if (e.boss) G.shake = Math.max(G.shake, REDUCE ? 0 : 8);
  if (e.type === "necro") {
    spawnEnemy("skeleton", Math.max(0, e.dist - 22), { summoned: true, hpMul: 0.7 });
    spawnEnemy("skeleton", Math.max(0, e.dist - 46), { summoned: true, hpMul: 0.7 });
  }
  sync();
}
function useHorn() {
  if (G.hornT > 0 || G.paused || G.ending || G.screen !== "play") return;
  G.hornT = 22;
  AudioBus.sfx("horn");
  G.shake = Math.max(G.shake, REDUCE ? 0 : 5);
  G.fx.push({ kind: "flash", age: 0, life: 0.28, color: "rgba(255,226,150,.4)" });
  G.banner = { text: "Рог храбрости!", sub: "Враги замедлены, герои ускорены", life: 1.5 };
  for (var i = 0; i < G.enemies.length; i++) {
    var e = G.enemies[i];
    if (!e.alive) continue;
    rawHit(e, e.boss ? e.maxHp * 0.05 : 42);
    if (e.alive) { e.slow = 0.5; e.slowT = 3; }
  }
  for (i = 0; i < G.towers.length; i++) G.towers[i].hasteT = 4;
  sync();
}
function updateBirds(t, dt) {
  var st = stats(t);
  var def = Campaign.TOWERS[t.type];
  while (t.birds.length < st.birds) t.birds.push(makeBird(t, t.birds.length));
  for (var i = 0; i < t.birds.length; i++) {
    var b = t.birds[i];
    b.flap += dt * 12;
    var slotX = t.x + (t.birds.length === 2 ? (i ? 12 : -12) : 0);
    var slotY = t.y - 28;
    if (b.state === "idle") {
      b.x += (slotX - b.x) * Math.min(1, dt * 4);
      b.y += (slotY - b.y) * Math.min(1, dt * 4);
      b.cool -= dt * rateMul(t);
      if (b.cool <= 0) {
        var target = pickTarget(t);
        if (target) {
          b.state = "go";
          b.targetId = target.id;
          b.hit = false;
          b.tx = target.x;
          b.ty = target.y;
          AudioBus.sfx("gryphon");
        }
      }
    } else {
      var e = enemyById(b.targetId);
      var tx, ty;
      if (b.state === "go" && e && e.alive) {
        tx = e.x;
        ty = e.y - (e.flying ? 28 : 8);
        b.tx = tx; b.ty = ty;
      } else if (b.state === "go") { tx = b.tx; ty = b.ty; }
      else { tx = slotX; ty = slotY; }
      var d = Math.hypot(tx - b.x, ty - b.y) || 1;
      var step = st.fly * dt * (t.hasteT > 0 ? 1.25 : 1);
      b.flip = tx < b.x ? -1 : 1;
      if (d <= step + 5) {
        b.x = tx; b.y = ty;
        if (b.state === "go") {
          if (e && e.alive && !b.hit) {
            deal(e, dmgOf(t, st.dmg), def, { tower: t });
            b.hit = true;
            pushFx({ kind: "nova", x: b.x, y: b.y, r: 24, life: 0.18, rgb: "220,226,232" });
            sparks(b.x, b.y, "#e4e0d4", 6, 55, 0.22);
          }
          b.state = "back";
        } else { b.state = "idle"; b.cool = cdOf(t); }
      } else {
        b.x += (tx - b.x) / d * step;
        b.y += (ty - b.y) / d * step;
        if (!REDUCE && Math.random() < 0.35) {
          pushFx({ kind: "p", x: b.x, y: b.y + 6, vx: (Math.random() - 0.5) * 16, vy: 12, g: 30, life: 0.28, color: "rgba(210,216,224,.75)", r: 2.2 });
        }
      }
    }
  }
}
function updateShots(dt) {
  for (var i = 0; i < G.shots.length; i++) {
    var p = G.shots[i];
    if (!p.alive) continue;
    if (p.kind === "arrow") {
      p.age += dt;
      if (p.age < (p.delay || 0)) continue;
      var e = enemyById(p.targetId);
      var tx = p.tx, ty = p.ty;
      if (e && e.alive) { tx = e.x; ty = e.y - (e.flying ? 28 : 8); p.tx = tx; p.ty = ty; }
      var ang = Math.atan2(ty - p.y, tx - p.x);
      var step = p.speed * dt;
      var dist = Math.hypot(tx - p.x, ty - p.y);
      p.ang = ang;
      if (dist <= step + 6) {
        p.alive = false;
        impactPop(p.style, tx, ty, ang);
        if (e && e.alive) {
          deal(e, p.dmg, Campaign.TOWERS[p.from], { tower: towerById(p.tid) });
          if (e.alive && p.slow) { e.slow = Math.max(e.slow, p.slow); e.slowT = Math.max(e.slowT, 1.6); }
        }
      } else {
        p.x += Math.cos(ang) * step;
        p.y += Math.sin(ang) * step;
        if (!p.trail) p.trail = [];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > (p.style === "bullet" ? 16 : 8)) p.trail.shift();
      }
    } else if (p.kind === "bomb") {
      p.t += dt / p.dur;
      e = enemyById(p.targetId);
      var gx = e && e.alive ? e.x : p.sx;
      var gy = e && e.alive ? e.y : p.sy;
      if (!(e && e.alive) && p.tx) { gx = p.tx; gy = p.ty; }
      if (e && e.alive) { p.tx = e.x; p.ty = e.y; }
      var u = Math.min(1, p.t);
      var goalX = e && e.alive ? e.x : (p.tx || p.sx);
      var goalY = e && e.alive ? e.y : (p.ty || p.sy);
      p.x = p.sx + (goalX - p.sx) * u;
      p.y = p.sy + (goalY - p.sy) * u - Math.sin(u * Math.PI) * 40;
      if (p.t >= 1) {
        p.alive = false;
        explode(goalX, goalY, p.dmg, p.splash, e, Campaign.TOWERS[p.from], towerById(p.tid), p.style);
      }
    } else if (p.kind === "bolt") {
      var spd = p.speed || 900;
      var nx = p.x + p.dx * spd * dt;
      var ny = p.y + p.dy * spd * dt;
      for (var k = 0; k < G.enemies.length; k++) {
        e = G.enemies[k];
        if (!e.alive || p.hits[e.id] || p.hitN >= p.maxHits) continue;
        var ey = e.y - (e.flying ? 22 : 0);
        if (distToSeg(e.x, ey, p.x, p.y, nx, ny) < 22) {
          p.hits[e.id] = 1;
          p.hitN++;
          deal(e, p.dmg, Campaign.TOWERS[p.from], { tower: towerById(p.tid) });
        }
      }
      p.px = p.x; p.py = p.y; p.x = nx; p.y = ny;
      if (!p.trail) p.trail = [];
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 14) p.trail.shift();
      p.left -= spd * dt;
      if (p.left <= 0 || p.hitN >= p.maxHits) {
        p.alive = false;
        impactPop(p.style || "power", p.x, p.y, Math.atan2(p.dy, p.dx));
      }
    }
  }
  G.shots = G.shots.filter(function (s) { return s.alive; });
}
function explode(x, y, dmg, splash, primary, def, tower, style) {
  flourish(tower, style === "anchor" ? "anchor" : "mine", x, y, splash);
  if (primary && primary.alive && !primary.flying) deal(primary, dmg, def, { tower: tower });
  for (var i = 0; i < G.enemies.length; i++) {
    var e = G.enemies[i];
    if (!e.alive || e === primary || e.flying) continue;
    var d = Math.hypot(e.x - x, e.y - y);
    if (d < splash) deal(e, dmg * (1 - d / splash * 0.5), def, { tower: tower });
  }
}
function towerById(id) {
  for (var i = 0; i < G.towers.length; i++) if (G.towers[i].id === id) return G.towers[i];
  return null;
}
function distToSeg(px, py, ax, ay, bx, by) {
  var abx = bx - ax, aby = by - ay;
  var l2 = abx * abx + aby * aby || 1;
  var t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / l2));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}
function burst(x, y, color, n) {
  for (var i = 0; i < n; i++) {
    if (REDUCE && i % 2) continue;
    var a = Math.random() * Math.PI * 2;
    var s = 40 + Math.random() * 110;
    pushFx({ kind: "p", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, g: 180, life: 0.45 + Math.random() * 0.25, color: color, r: 2 + Math.random() * 2.4, glow: 1 });
  }
}
function firework() {
  burst(80 + Math.random() * 800, 30 + Math.random() * 180, ["#ffd56a", "#8eb7ff", "#ff8ad4", "#fff"][(Math.random() * 4) | 0], 16);
}
function floatText(x, y, text, color) {
  if (G.texts.length > 70) G.texts.shift();
  G.texts.push({ x: x, y: y, text: text, color: color, age: 0, life: 0.7 });
}
function updateFx(dt) {
  for (var i = 0; i < G.fx.length; i++) {
    var f = G.fx[i];
    f.age += dt;
    if (f.kind === "p") { f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  }
  G.fx = G.fx.filter(function (f) { return f.age < f.life; });
  for (i = 0; i < G.texts.length; i++) { G.texts[i].age += dt; G.texts[i].y -= dt * 26; }
  G.texts = G.texts.filter(function (t) { return t.age < t.life; });
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  if (G.toast) { G.toast.life -= dt; if (G.toast.life <= 0) G.toast = null; }
  G.shake = Math.max(0, G.shake - dt * 14);
}

function render() {
  if (!G.map) return;
  var ctx = gfx;
  var sx = !REDUCE && G.shake > 0.3 ? (Math.random() - 0.5) * G.shake : 0;
  var sy = !REDUCE && G.shake > 0.3 ? (Math.random() - 0.5) * G.shake : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 960, 600);
  ctx.save();
  ctx.translate(sx, sy);
  drawMap(ctx);
  drawUnits(ctx);
  drawShots(ctx);
  drawFx(ctx);
  ctx.restore();
}
function drawMap(ctx) {
  var map = G.map;
  var theme = THEMES[map.biome] || THEMES.hillsbrad;
  var t = G.time;
  ctx.fillStyle = theme.grass;
  ctx.fillRect(-20, -20, 1000, 640);
  ctx.fillStyle = theme.grass2;
  for (var i = 0; i < map.flowers.length; i += 3) {
    var f = map.flowers[i];
    ctx.fillRect(f.x, f.y, 18, 10);
  }
  map.ponds.forEach(function (k) {
    var xy = k.split(",");
    var x = (+xy[0] + 0.5) * CELL, y = (+xy[1] + 0.5) * CELL;
    ctx.fillStyle = theme.water;
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 2, 8, 3, t, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeRoad(ctx, map.poly, 40, theme.road);
  strokeRoad(ctx, map.poly, 24, theme.road2);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 12]);
  strokeRoad(ctx, map.poly, 2, "rgba(255,255,255,.35)");
  ctx.restore();
  for (i = 0; i < map.flowers.length; i++) {
    f = map.flowers[i];
    ctx.fillStyle = f.c;
    ctx.fillRect(f.x, f.y, 4, 4);
  }
  for (i = 0; i < map.trees.length; i++) drawTree(ctx, map.trees[i], theme, map.biome);
  var end = map.poly[map.poly.length - 1];
  drawExit(ctx, end.x, end.y, map.exit, t);
  drawWeather(ctx, map, t);
  if (G.level.id === 1 && !G.towers.length && map.hint) {
    var hx = map.hint[0] * CELL, hy = map.hint[1] * CELL;
    ctx.strokeStyle = "rgba(255,220,120," + (0.45 + 0.45 * Math.sin(t * 5)) + ")";
    ctx.lineWidth = 3;
    ctx.strokeRect(hx + 6, hy + 6, CELL - 12, CELL - 12);
  }
  if (G.mouse.cell && G.arm) {
    ctx.strokeStyle = "rgba(255,255,255,.3)";
    ctx.strokeRect(G.mouse.cell[0] * CELL + 3, G.mouse.cell[1] * CELL + 3, CELL - 6, CELL - 6);
  }
  drawRange(ctx);
  var vg = ctx.createRadialGradient(480, 300, 180, 480, 300, 560);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.28)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 960, 600);
}
function strokeRoad(ctx, pts, width, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function drawTree(ctx, tree, theme, biome) {
  var s = tree.s;
  ctx.fillStyle = theme.trunk;
  ctx.fillRect(tree.x - 3 * s, tree.y - 6 * s, 6 * s, 14 * s);
  ctx.fillStyle = theme.tree;
  ctx.beginPath();
  ctx.arc(tree.x, tree.y - 14 * s, 13 * s, 0, Math.PI * 2);
  ctx.fill();
  if (biome === "snow" || biome === "northrend" || biome === "icecrown") {
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.beginPath();
    ctx.arc(tree.x - 2, tree.y - 18 * s, 7 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawExit(ctx, x, y, kind, t) {
  if (kind === "throne") {
    ctx.fillStyle = "rgba(150,210,255," + (0.25 + 0.15 * Math.sin(t * 3)) + ")";
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d7e6f4";
    ctx.fillRect(x - 26, y - 6, 52, 18);
    ctx.fillRect(x - 16, y - 34, 32, 30);
    ctx.fillStyle = "#7ec8ee";
    ctx.fillRect(x - 5, y - 48, 10, 16);
    ctx.fillStyle = "#16324a";
    ctx.fillRect(x - 18, y - 34, 36, 8);
    return;
  }
  ctx.fillStyle = "#6e655c";
  ctx.fillRect(x - 28, y - 36, 12, 44);
  ctx.fillRect(x + 16, y - 36, 12, 44);
  ctx.fillRect(x - 30, y - 44, 60, 12);
  ctx.fillStyle = kind === "sun" ? "#e6c56a" : "#2f6fd0";
  var w = Math.sin(t * 3) * 3;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 40);
  ctx.lineTo(x + 16, y - 40);
  ctx.lineTo(x + 14, y - 18 + w);
  ctx.lineTo(x, y - 24);
  ctx.lineTo(x - 14, y - 18 - w);
  ctx.fill();
  if (kind === "portal" || kind === "sun") {
    ctx.strokeStyle = kind === "sun" ? "#ffe08a" : "#9ec0ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 16 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
function drawWeather(ctx, map, t) {
  var snow = map.biome === "snow" || map.biome === "northrend" || map.biome === "icecrown";
  var color = snow ? "rgba(255,255,255,.9)" : map.biome === "elf" ? "rgba(255,214,90,.85)" : map.biome === "plague" ? "rgba(170,140,190,.45)" : "rgba(255,255,255,.35)";
  if (map.biome === "dalaran" || map.biome === "violet") color = "rgba(190,170,255,.75)";
  if (map.biome === "nerub") color = "rgba(180,150,80,.4)";
  if (map.biome === "naxx") color = "rgba(150,190,90,.4)";
  for (var i = 0; i < map.flakes.length; i++) {
    var f = map.flakes[i];
    var y = (f.y + t * f.sp * (snow ? 1 : 0.55)) % 620;
    ctx.fillStyle = color;
    ctx.fillRect(f.x, y - 20, f.s, f.s);
  }
}
function drawRange(ctx) {
  var x, y, range, bad = false;
  if (G.arm && G.mouse.cell) {
    x = (G.mouse.cell[0] + 0.5) * CELL;
    y = (G.mouse.cell[1] + 0.5) * CELL;
    range = Campaign.TOWERS[G.arm].levels[0].range;
    bad = !terrainFree(G.mouse.cell[0], G.mouse.cell[1]) || !!towerAt(G.mouse.cell[0], G.mouse.cell[1]) || G.gold < Campaign.TOWERS[G.arm].cost;
  } else {
    var sel = selectedTower();
    if (!sel) return;
    x = sel.x; y = sel.y; range = stats(sel).range;
  }
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fillStyle = bad ? "rgba(255,100,80,.1)" : "rgba(255,220,120,.1)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = bad ? "rgba(255,120,100,.85)" : "rgba(255,220,120,.85)";
  ctx.stroke();
}
function drawUnits(ctx) {
  var items = [];
  for (var i = 0; i < G.towers.length; i++) items.push({ y: G.towers[i].y, t: G.towers[i] });
  for (i = 0; i < G.enemies.length; i++) items.push({ y: G.enemies[i].y, e: G.enemies[i] });
  items.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < items.length; i++) {
    if (items[i].t) drawTower(ctx, items[i].t);
    else drawEnemy(ctx, items[i].e);
  }
  if (G.arm && G.mouse.cell && terrainFree(G.mouse.cell[0], G.mouse.cell[1]) && !towerAt(G.mouse.cell[0], G.mouse.cell[1])) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawBase(ctx, (G.mouse.cell[0] + 0.5) * CELL, (G.mouse.cell[1] + 0.5) * CELL, G.gold >= Campaign.TOWERS[G.arm].cost ? towerColor(G.arm) : "#e05a4f", 1);
    if (!drawIcon(ctx, G.arm, (G.mouse.cell[0] + 0.5) * CELL, (G.mouse.cell[1] + 0.5) * CELL + 8, 54)) {
      drawChibi(ctx, G.arm, (G.mouse.cell[0] + 0.5) * CELL, (G.mouse.cell[1] + 0.5) * CELL + 2, 1.05, { phase: G.time });
    }
    ctx.restore();
  }
  for (i = 0; i < G.towers.length; i++) {
    var tower = G.towers[i];
    if (!tower.birds) continue;
    for (var b = 0; b < tower.birds.length; b++) {
      var bird = tower.birds[b];
      var sz = bird.state === "idle" ? 36 : 42;
      if (!drawIcon(ctx, "familiar", bird.x, bird.y + 6, sz)) {
        drawChibi(ctx, "familiar", bird.x, bird.y, bird.state === "idle" ? 0.85 : 1.05, { phase: bird.flap, flip: bird.flip || 1 });
      }
    }
  }
}
function drawTower(ctx, t) {
  drawBase(ctx, t.x, t.y, towerColor(t.type), t.lv);
  if (hasItem(t, "radiance")) drawAura(ctx, t.x, t.y, 90, "255,170,50", 0.42);
  if (Campaign.TOWERS[t.type].attack === "hook") drawAura(ctx, t.x, t.y, (stats(t).splash || 100) * 0.72, "120,168,48", 0.24);
  if (G.sel === t.id) {
    ctx.strokeStyle = "#fff4c2";
    ctx.lineWidth = 2;
    ctx.strokeRect(t.cx * CELL + 4, t.cy * CELL + 4, CELL - 8, CELL - 8);
  }
  if (Campaign.TOWERS[t.type].attack === "birds") drawRoost(ctx, t.x, t.y);
  if (!drawIcon(ctx, t.type, t.x, t.y + 6 - t.recoil * 4, 54)) {
    drawChibi(ctx, t.type, t.x, t.y + 4 - t.recoil * 5, 1.08, { phase: G.time * 1.5 + t.id });
  }
  for (var n = 0; n < t.mines.length; n++) {
    var mine = t.mines[n];
    var blink = 0.4 + 0.6 * Math.abs(Math.sin(G.time * 6 + n));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,70,30," + (0.4 * blink) + ")";
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#24140e";
    ctx.beginPath();
    ctx.arc(mine.x, mine.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,54,32," + blink + ")";
    ctx.beginPath();
    ctx.arc(mine.x, mine.y - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (n = 0; n < t.items.length; n++) {
    var slot = "item:" + t.items[n];
    if (!drawIcon(ctx, slot, t.x - 16 + n * 16, t.y + 22, 16)) {
      ctx.fillStyle = Campaign.ITEMS[t.items[n]].color;
      ctx.fillRect(t.x - 12 + n * 8, t.y + 14, 6, 4);
    }
  }
  if (t.hasteT > 0) {
    ctx.strokeStyle = "rgba(255,220,120,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 8, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (t.freezeT > 0 || t.slowT > 0) {
    ctx.fillStyle = t.freezeT > 0 ? "rgba(200,235,255,.45)" : "rgba(170,210,255,.22)";
    ctx.beginPath();
    ctx.arc(t.x, t.y - 8, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawAura(ctx, x, y, r, rgb, a) {
  var pulse = a + (REDUCE ? 0 : 0.08 * Math.sin(G.time * 3.2));
  var g = ctx.createRadialGradient(x, y - 8, r * 0.12, x, y - 8, r);
  g.addColorStop(0, "rgba(" + rgb + "," + pulse + ")");
  g.addColorStop(1, "rgba(" + rgb + ",0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 8, r, 0, Math.PI * 2);
  ctx.fill();
}
function drawBase(ctx, x, y, color, lv) {
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 16, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f0d78a";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (var i = 0; i < lv; i++) {
    ctx.fillStyle = "#fff6d0";
    ctx.beginPath();
    ctx.arc(x - 8 + i * 8, y + 8, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawRoost(ctx, x, y) {
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(x - 16, y - 4, 32, 6);
  ctx.fillRect(x - 12, y - 4, 4, 14);
  ctx.fillRect(x + 8, y - 4, 4, 14);
}
function drawEnemy(ctx, e) {
  if (e.alive && e.burrowT > 0) {
    ctx.fillStyle = "rgba(74,56,32,.92)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 8, 18 * e.scale, 7 * e.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(36,26,16,.9)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + 6, 8 * e.scale, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    var bw = 28 * Math.min(e.scale, 1.4);
    var bx = e.x - bw / 2, by = e.y - 30;
    ctx.fillStyle = "#1b2030";
    ctx.fillRect(bx, by, bw, 4);
    ctx.fillStyle = "#c4a06a";
    ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 4);
    return;
  }
  var hover = e.flying ? 22 + Math.sin(G.time * 3 + e.id) * 4 : 0;
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + 8, 12 * e.scale, 5 * e.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = e.alive ? 1 : Math.max(0, e.fade / 0.5);
  if (!drawIcon(ctx, e.type, e.x, e.y + 6 - hover, 46 * Math.min(e.scale, 1.45))) {
    drawChibi(ctx, e.type, e.x, e.y + 2 - hover, e.scale, { phase: G.time * (e.flying ? 3 : 1.6) + e.id, flip: e.flip || 1, flash: e.flash || 0 });
  }
  ctx.restore();
  if (e.warned && e.alive) {
    ctx.strokeStyle = e.ai === "butcher" ? "rgba(255,150,70,.8)" : e.ai === "burrow" ? "rgba(196,150,80,.85)" : "rgba(160,220,255,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.ai === "kel" ? 168 : 34 * e.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (e.guarded && e.alive) {
    ctx.strokeStyle = "rgba(196,160,90,.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y - hover - 10, 22 * e.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (e.shieldT > 0) {
    ctx.strokeStyle = "rgba(176,140,255,.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y - hover - 16, 20 * e.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (!e.alive) return;
  var w = 28 * Math.min(e.scale, 1.4);
  var bx = e.x - w / 2, by = e.y - hover - 46 * Math.min(e.scale, 1.5);
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(bx, by, w, 4);
  var pct = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = pct > 0.45 ? "#7ddea2" : "#ff6d7d";
  ctx.fillRect(bx, by, w * pct, 4);
}
function pushFx(f) {
  if (G.fx.length > (REDUCE ? 180 : 520)) G.fx.shift();
  f.age = 0;
  G.fx.push(f);
}
function sparks(x, y, color, n, speed, life) {
  n = REDUCE ? Math.ceil(n / 3) : n;
  speed = speed || 80;
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2;
    var s = speed * (0.35 + Math.random() * 0.8);
    pushFx({
      kind: "p", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.15,
      g: 60, life: (life || 0.35) * (0.75 + Math.random() * 0.4),
      color: color, r: 1.5 + Math.random() * 2.1, glow: 1
    });
  }
}
function castMark(t) {
  if (!t) return;
  var sk = Campaign.SKILLS[t.type];
  if (!sk) return;
  var rank = Math.min(t.lv || 1, sk.ranks || 1);
  pushFx({ kind: "badge", icon: "skill:" + t.type + ":" + rank, x: t.x, y: t.y - 56, life: 0.46 });
}
function flourish(t, kind, x, y, radius) {
  radius = radius || 70;
  if (kind === "spin") {
    pushFx({ kind: "fury", x: x, y: y - 18, r: radius, life: 0.58 });
    sparks(x, y - 12, "#fff1d0", 16, 150, 0.32);
    sparks(x, y - 12, "#ff7a32", 8, 90, 0.34);
    if (!REDUCE) G.shake = Math.max(G.shake || 0, 2.5);
  } else if (kind === "call") {
    pushFx({ kind: "nova", x: x, y: y, r: radius, life: 0.42, rgb: "255,90,60", shards: 10 });
    pushFx({ kind: "waves", x: x, y: y, r: radius, life: 0.48, rgb: "255,160,90", n: 3 });
    sparks(x, y, "#ffb080", 12, 80, 0.36);
    if (!REDUCE) G.shake = Math.max(G.shake || 0, 3);
  } else if (kind === "nova") {
    pushFx({ kind: "nova", x: x, y: y, r: radius, life: 0.5, rgb: "170,225,255", shards: 12 });
    sparks(x, y, "#e7f8ff", 14, 70, 0.42);
  } else if (kind === "pulse") {
    pushFx({ kind: "nova", x: x, y: y, r: radius, life: 0.48, rgb: "150,220,80", dark: "16,36,8", shards: 8 });
    sparks(x, y, "#b6e86a", 10, 55, 0.36);
  } else if (kind === "scream") {
    pushFx({ kind: "waves", x: x, y: y - 8, r: radius, life: 0.5, rgb: "230,140,255", n: 4 });
    pushFx({ kind: "nova", x: x, y: y - 8, r: radius * 0.42, life: 0.26, rgb: "255,190,255" });
    sparks(x, y - 8, "#f0b0ff", 10, 90, 0.32);
  } else if (kind === "mine") {
    pushFx({ kind: "nova", x: x, y: y, r: Math.max(radius, 56), life: 0.4, rgb: "255,150,50", shards: 8 });
    pushFx({ kind: "waves", x: x, y: y, r: radius + 12, life: 0.34, rgb: "255,220,140", n: 2 });
    sparks(x, y, "#ffd27a", 16, 140, 0.4);
    sparks(x, y, "#ff5a2a", 8, 70, 0.36);
    if (!REDUCE) G.shake = Math.max(G.shake || 0, 5);
  } else if (kind === "ravage") {
    pushFx({ kind: "ravage", x: x, y: y, r: radius, life: 0.84 });
    sparks(x, y, "#e7f8ff", 22, 120, 0.5);
    sparks(x, y, "#7ec8ee", 10, 50, 0.45);
    if (!REDUCE) pushFx({ kind: "flash", life: 0.16, color: "rgba(190,235,255,.28)" });
    if (!REDUCE) G.shake = Math.max(G.shake || 0, 7);
  } else if (kind === "anchor") {
    pushFx({ kind: "nova", x: x, y: y, r: radius, life: 0.32, rgb: "140,210,255", shards: 6 });
    sparks(x, y, "#dff6ff", 10, 70, 0.28);
    if (!REDUCE) G.shake = Math.max(G.shake || 0, 3);
  }
}
function impactPop(style, x, y, ang) {
  if (style === "frost") {
    pushFx({ kind: "nova", x: x, y: y, r: 28, life: 0.2, rgb: "186,232,255", shards: 6 });
    sparks(x, y, "#e7f7ff", 6, 55, 0.24);
  } else if (style === "bullet") {
    sparks(x, y, "#ffe7a8", 7, 110, 0.16);
    pushFx({ kind: "nova", x: x, y: y, r: 16, life: 0.1, rgb: "255,220,140" });
  } else if (style === "claw") {
    pushFx({ kind: "claw", x: x, y: y, life: 0.28, ang: ang || -0.7 });
    sparks(x, y, "#ff6a3c", 6, 70, 0.2);
  } else if (style === "hook") {
    sparks(x, y, "#d2ff6a", 5, 40, 0.26);
    sparks(x, y, "#ff6a4a", 4, 36, 0.22);
  } else if (style === "sonic") {
    pushFx({ kind: "waves", x: x, y: y, r: 52, life: 0.3, rgb: "230,150,255", n: 2 });
  } else if (style === "power") {
    pushFx({ kind: "nova", x: x, y: y, r: 32, life: 0.18, rgb: "190,255,206" });
  }
}
function drawStreak(ctx, pts, rgb, wide) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(" + rgb + ",.4)";
  ctx.lineWidth = wide;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.lineWidth = Math.max(1.4, wide * 0.2);
  ctx.stroke();
  ctx.restore();
}
function drawChain(ctx, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  var n = Math.max(2, Math.floor(len / 11));
  ctx.save();
  ctx.strokeStyle = "#8a7344";
  ctx.lineWidth = 2;
  for (var i = 0; i < n; i++) {
    var t = i / n;
    ctx.beginPath();
    ctx.ellipse(x1 + dx * t, y1 + dy * t, 4.2, 2.3, Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.translate(x2, y2);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.strokeStyle = "#f2efe6";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(2, 0, 7, -0.5, 2.5);
  ctx.stroke();
  ctx.restore();
}
function drawShots(ctx) {
  for (var i = 0; i < G.shots.length; i++) {
    var p = G.shots[i];
    if (p.kind === "arrow") {
      if (p.style === "hook" && p.ox) drawChain(ctx, p.ox, p.oy, p.x, p.y);
      var rgb = p.style === "frost" ? "170,230,255" : p.style === "bullet" ? "255,214,110" : p.style === "claw" ? "255,78,48" : "255,236,196";
      var pts = (p.trail || []).concat([{ x: p.x, y: p.y }]);
      drawStreak(ctx, pts, rgb, p.style === "bullet" ? 5 : p.style === "claw" ? 7 : 9);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang || 0);
      ctx.globalCompositeOperation = "lighter";
      if (p.style === "bullet") {
        ctx.fillStyle = "#fff8e4";
        ctx.fillRect(-2, -1.2, 12, 2.4);
      } else if (p.style === "claw") {
        ctx.strokeStyle = "#ffe0d4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -5); ctx.lineTo(10, 0); ctx.lineTo(-8, 5);
        ctx.stroke();
      } else if (p.style !== "hook") {
        ctx.fillStyle = p.style === "frost" ? "#f4fcff" : "#fff4d4";
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(-2, 3.2); ctx.lineTo(-2, -3.2); ctx.fill();
      }
      ctx.restore();
    } else if (p.kind === "bomb") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(140,210,255,.45)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#d8e6ee";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7ec4e4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x + 1, p.y + 2, 6, 0.4, 2.6);
      ctx.stroke();
    } else if (p.kind === "bolt") {
      var beam = p.style === "sonic" ? "236,150,255" : "186,255,206";
      drawStreak(ctx, (p.trail || []).concat([{ x: p.x, y: p.y }]), beam, p.style === "sonic" ? 16 : 13);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.dy || 0, p.dx || 1));
      ctx.globalCompositeOperation = "lighter";
      if (p.style === "sonic") {
        ctx.strokeStyle = "rgba(255,220,255,.95)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 11, -1.25, 1.25);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#f4fff6";
        ctx.beginPath();
        ctx.moveTo(18, 0); ctx.lineTo(-8, 6); ctx.lineTo(-4, 0); ctx.lineTo(-8, -6); ctx.fill();
      }
      ctx.restore();
    }
  }
}
function drawSpark(ctx, f, a) {
  ctx.save();
  if (f.glow && !REDUCE) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = a;
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawNova(ctx, f) {
  var p = Math.min(1, f.age / f.life);
  var rad = Math.max(6, f.r * (0.16 + 0.84 * p));
  var fade = 1 - p;
  ctx.save();
  ctx.translate(f.x, f.y);
  if (f.dark) {
    ctx.globalAlpha = 0.45 * fade;
    ctx.fillStyle = "rgb(" + f.dark + ")";
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.78, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  var g = ctx.createRadialGradient(0, 0, rad * 0.08, 0, 0, rad);
  g.addColorStop(0, "rgba(255,255,255," + (0.72 * fade) + ")");
  g.addColorStop(0.42, "rgba(" + f.rgb + "," + (0.5 * fade) + ")");
  g.addColorStop(1, "rgba(" + f.rgb + ",0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "rgba(255,255,255,.88)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.stroke();
  if (!REDUCE && f.shards) {
    ctx.strokeStyle = "rgba(" + f.rgb + ",.95)";
    ctx.lineWidth = 1.6;
    for (var i = 0; i < f.shards; i++) {
      var a = i / f.shards * Math.PI * 2 + f.age * 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * rad * 0.42, Math.sin(a) * rad * 0.42);
      ctx.lineTo(Math.cos(a) * (rad + 6), Math.sin(a) * (rad + 6));
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawWaves(ctx, f) {
  var p = f.age / f.life;
  var n = f.n || 3;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (var i = 0; i < n; i++) {
    var lp = Math.min(1, Math.max(0, (p * 1.15 - i * 0.12) / 0.78));
    if (lp <= 0) continue;
    ctx.globalAlpha = (1 - lp) * 0.9;
    ctx.strokeStyle = "rgb(" + f.rgb + ")";
    ctx.lineWidth = Math.max(1.5, 5 - i);
    ctx.beginPath();
    ctx.arc(f.x, f.y, Math.max(4, f.r * (0.12 + 0.88 * lp)), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
function drawFury(ctx, f) {
  var fade = 1 - f.age / f.life;
  var spin = G.time * 18;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.globalAlpha = 0.55 * fade;
  ctx.strokeStyle = "rgba(255,214,160,.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 12, f.r * (0.9 + 0.04 * Math.sin(G.time * 22)), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  var blades = REDUCE ? 3 : 6;
  for (var pass = 0; pass < 2; pass++) {
    ctx.globalAlpha = pass ? fade : fade * 0.35;
    for (var i = 0; i < blades; i++) {
      ctx.save();
      ctx.rotate(spin * (pass ? 1 : 0.72) + i * (Math.PI * 2 / blades) + pass);
      ctx.fillStyle = i % 2 ? "rgba(255,248,230,.95)" : "rgba(255,168,70,.92)";
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.lineTo(30 + (i % 2) * 6, -1.4);
      ctx.lineTo(42 + (i % 3) * 5, 0);
      ctx.lineTo(30, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}
function drawRavage(ctx, f) {
  var p = Math.min(1, f.age / f.life);
  var rad = 18 + (f.r - 18) * Math.min(1, p / 0.6);
  var fade = 1 - p;
  var rise = Math.sin(Math.min(1, p / 0.7) * Math.PI);
  ctx.save();
  ctx.translate(f.x, f.y);
  var g = ctx.createRadialGradient(0, 4, 6, 0, 4, rad);
  g.addColorStop(0, "rgba(214,246,255," + (0.4 * fade) + ")");
  g.addColorStop(1, "rgba(16,70,110,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 8, rad, rad * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  var n = REDUCE ? 8 : 14;
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2;
    var len = rad * (0.7 + (i % 3) * 0.08);
    ctx.strokeStyle = i % 2 ? "rgba(236,252,255,.95)" : "rgba(64,186,226,.95)";
    ctx.lineWidth = 3 + rise * 3.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 7);
    ctx.quadraticCurveTo(Math.cos(a) * len * 0.45, Math.sin(a) * len * 0.18 - (28 + (i % 2) * 12) * rise, Math.cos(a) * len, Math.sin(a) * len * 0.46);
    ctx.stroke();
  }
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "rgba(230,250,255,.9)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 8, rad * 0.96, rad * 0.38, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function drawClaw(ctx, f) {
  var p = f.age / f.life;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.ang || -0.6);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,70,48," + (1 - p) + ")";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (var i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-14 + i * 7, -16);
    ctx.lineTo(12 + i * 7, 16);
    ctx.stroke();
  }
  ctx.restore();
}
function strokeBolt(ctx, pts, rgb, width, jag, alpha) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgb(" + rgb + ")";
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) {
    var A = pts[i - 1], B = pts[i];
    var mx = (A.x + B.x) / 2 + Math.sin(G.time * 46 + i * 2.2) * jag;
    var my = (A.y + B.y) / 2 + Math.cos(G.time * 40 + i) * jag;
    ctx.lineTo(mx, my);
    ctx.lineTo(B.x, B.y);
  }
  ctx.stroke();
}
function drawZap(ctx, f) {
  var pts = f.pts;
  if (!pts || pts.length < 2) return;
  var a = 1 - f.age / f.life;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  var glow = f.ice ? "150,220,255" : "255,210,110";
  var core = f.ice ? "236,250,255" : "255,252,236";
  strokeBolt(ctx, pts, glow, 8, 11, 0.4 * a);
  strokeBolt(ctx, pts, core, 2.2, 4, 0.95 * a);
  ctx.fillStyle = "rgba(" + core + "," + a + ")";
  for (var i = 1; i < pts.length; i++) {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, 6 + 4 * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawFx(ctx) {
  for (var i = 0; i < G.fx.length; i++) {
    var f = G.fx[i];
    var a = Math.max(0, 1 - f.age / f.life);
    if (f.kind === "p") drawSpark(ctx, f, a);
    else if (f.kind === "ring") {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = f.color || "#ffb15a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.35 + 0.65 * f.age / f.life), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "zap") drawZap(ctx, f);
    else if (f.kind === "nova") drawNova(ctx, f);
    else if (f.kind === "waves") drawWaves(ctx, f);
    else if (f.kind === "fury") drawFury(ctx, f);
    else if (f.kind === "ravage") drawRavage(ctx, f);
    else if (f.kind === "claw") drawClaw(ctx, f);
    else if (f.kind === "badge" && iconReady(f.icon)) {
      ctx.save();
      ctx.globalAlpha = a;
      drawIcon(ctx, f.icon, f.x, f.y, 22 + a * 16);
      ctx.restore();
    } else if (f.kind === "flash") {
      ctx.save();
      ctx.fillStyle = f.color || "rgba(255,230,160,.3)";
      ctx.globalAlpha = a;
      ctx.fillRect(0, 0, 960, 600);
      ctx.restore();
    }
  }
  ctx.save();
  ctx.font = "800 14px Nunito, sans-serif";
  ctx.textAlign = "center";
  for (i = 0; i < G.texts.length; i++) {
    var tx = G.texts[i];
    ctx.globalAlpha = Math.max(0, 1 - tx.age / tx.life);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1b2030";
    ctx.strokeText(tx.text, tx.x, tx.y);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, tx.x, tx.y);
  }
  ctx.restore();
}

function circ(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1b2030";
  ctx.stroke();
}
function oval(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1b2030";
  ctx.stroke();
}
function limb(ctx, x1, y1, x2, y2, color) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#1b2030";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = color;
  ctx.stroke();
}
function box(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1b2030";
  ctx.stroke();
}

var PEOPLE = {
  archer: { skin: "#f0c4a0", hair: "#8a4b22", tunic: "#2f6fd0", cape: "#1e4e9c", pants: "#3a2a22", weapon: "bow" },
  guard: { skin: "#f0c4a0", hair: "#6a6258", tunic: "#2f6fd0", cape: "#1e4e9c", pants: "#3a2a22", weapon: "sword", helm: "#d5dbe6" },
  uther: { skin: "#f0c4a0", hair: "#e6e0d4", tunic: "#f7f4ee", cape: "#e6c56a", pants: "#d5dbe8", weapon: "hammer", halo: 1 },
  light: { skin: "#f0c4a0", hair: "#e6e0d4", tunic: "#f7f4ee", cape: "#e6c56a", pants: "#d5dbe8", weapon: "hammer", halo: 1 },
  muradin: { skin: "#f0c4a0", hair: "#e07a32", tunic: "#8a5a32", cape: "#2f6fd0", pants: "#5a4030", weapon: "hammer", short: 1, beard: 1, helm: "#e6c56a" },
  cannon: { skin: "#f0c4a0", hair: "#e07a32", tunic: "#8a5a32", cape: "#2f6fd0", pants: "#5a4030", weapon: "none", short: 1, beard: 1, helm: "#e6c56a", gun: 1 },
  alleria: { skin: "#f3d2b5", hair: "#f2d48a", tunic: "#2f8a55", cape: "#1d5c38", pants: "#2c4a34", weapon: "bow", ears: 1 },
  ballista: { skin: "#f3d2b5", hair: "#f2d48a", tunic: "#2f8a55", cape: "#1d5c38", pants: "#2c4a34", weapon: "bow", ears: 1, siege: 1 },
  falstad: { skin: "#f0c4a0", hair: "#e07a32", tunic: "#8a3a2a", cape: "#e6c56a", pants: "#4a3428", weapon: "hammer", short: 1, beard: 1, helm: "#e6c56a" },
  jaina: { skin: "#f6d3b8", hair: "#f4e2a8", tunic: "#6a4ad4", cape: "#e4e0f6", pants: "#3a2a66", weapon: "staff", skirt: 1 },
  arthas: { skin: "#f0c4a0", hair: "#f2d48a", tunic: "#2a4f9e", cape: "#e6c56a", pants: "#2a3148", weapon: "hammer", helm: "#e6c56a" },
  necro: { skin: "#ddd8ee", hair: "#1b2030", tunic: "#5a3ea8", cape: "#3a2268", pants: "#241838", weapon: "staff", hood: 1 },
  necrofos: { skin: "#9a8a6a", hair: "#2a2418", tunic: "#3a4a28", cape: "#1e2814", pants: "#241c14", weapon: "staff", hood: 1 },
  drow: { skin: "#f0c4a0", hair: "#d8d8e8", tunic: "#5a6a7a", cape: "#2a3444", pants: "#2a3038", weapon: "bow", hood: 1 },
  jugg: { skin: "#e8b898", hair: "#1b2030", tunic: "#c4553a", cape: "#7a1e1e", pants: "#2a241c", weapon: "sword", helm: "#d8d0c4" },
  cm: { skin: "#f6d3b8", hair: "#7ec8ee", tunic: "#e7f6ff", cape: "#9fd4ee", pants: "#d5e8f4", weapon: "staff", skirt: 1 },
  zeus: { skin: "#f0c4a0", hair: "#f4f4f4", tunic: "#f7f4ee", cape: "#e6c56a", pants: "#d5dbe8", weapon: "staff", beard: 1 },
  axe: { skin: "#c47a5a", hair: "#1b2030", tunic: "#8a2a22", cape: "#3a1a18", pants: "#2a201c", weapon: "axe", helm: "#c4553a" },
  sniper: { skin: "#d8b090", hair: "#6b4a2a", tunic: "#5a6a3a", cape: "#3a4428", pants: "#3a3428", weapon: "bow", helm: "#6a5a32" },
  wr: { skin: "#f3d2b5", hair: "#f2d48a", tunic: "#2f8a55", cape: "#e6c56a", pants: "#2c4a34", weapon: "bow", skirt: 1 },
  frostlich: { skin: "#d7e4ee", hair: "#7ec8ee", tunic: "#1a3a4a", cape: "#16324a", pants: "#102430", weapon: "staff", hood: 1 },
  ursa: { skin: "#c48a62", hair: "#6b3a22", tunic: "#8a5a32", cape: "#5a3018", pants: "#4a3428", weapon: "axe", beard: 1 },
  pudge: { skin: "#8d9a62", hair: "#3e4630", tunic: "#6d7a48", cape: "#4a4030", pants: "#3e4630", weapon: "hook" },
  qop: { skin: "#f0c4a0", hair: "#2a1028", tunic: "#8a2a78", cape: "#e6c56a", pants: "#3a1840", weapon: "sword", skirt: 1 },
  visage: { skin: "#c8c0b0", hair: "#6a6258", tunic: "#4a5568", cape: "#2a3140", pants: "#2a241c", weapon: "staff", helm: "#8a9098" },
  techies: { skin: "#f0c4a0", hair: "#e07a32", tunic: "#3a6a32", cape: "#c4553a", pants: "#3a3428", weapon: "none", short: 1, gun: 1 },
  tide: { skin: "#7ec0e0", hair: "#1a4a66", tunic: "#1a5a78", cape: "#0e3a50", pants: "#143848", weapon: "hammer" }
};

function drawChibi(ctx, kind, x, y, sc, opt) {
  opt = opt || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((opt.flip || 1) * sc, sc);
  ctx.translate(0, Math.sin(opt.phase || 0) * 1.3);
  var walk = Math.sin((opt.phase || 0) * 8);
  if (PEOPLE[kind]) paintPerson(ctx, PEOPLE[kind], walk);
  else if (kind === "ghoul") paintGhoul(ctx, walk);
  else if (kind === "skeleton") paintSkeleton(ctx, walk);
  else if (kind === "abom" || kind === "butcher") paintBrute(ctx, walk, kind === "butcher");
  else if (kind === "gargoyle") paintGargoyle(ctx, walk);
  else if (kind === "wolf") paintWolf(ctx, walk);
  else if (kind === "banshee" || kind === "wail") paintBanshee(ctx, walk);
  else if (kind === "scarab") paintScarab(ctx, walk);
  else if (kind === "anub") paintAnub(ctx, walk);
  else if (kind === "naga") paintNaga(ctx, walk);
  else if (kind === "frost") paintFrost(ctx);
  else if (kind === "wyrm") paintWyrm(ctx, walk);
  else if (kind === "malganis") paintDread(ctx, walk);
  else if (kind === "kel") paintKel(ctx, walk);
  else if (kind === "lich") paintLich(ctx, walk);
  else if (kind === "familiar") paintGargoyle(ctx, opt.phase || 0);
  else if (kind === "gryphon") paintGryphon(ctx, opt.phase || 0);
  else paintGhoul(ctx, walk);
  if (opt.flash > 0) {
    ctx.fillStyle = "rgba(255,255,255," + Math.min(0.7, opt.flash) + ")";
    ctx.beginPath();
    ctx.ellipse(0, -16, 16, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function paintPerson(ctx, o, walk) {
  if (o.short) ctx.translate(0, 4);
  if (o.cape) {
    ctx.fillStyle = o.cape;
    ctx.beginPath();
    ctx.moveTo(-7, -22);
    ctx.quadraticCurveTo(-16, 0, -8 + walk * 2, 8);
    ctx.lineTo(8, 6);
    ctx.quadraticCurveTo(12, -6, 6, -20);
    ctx.fill();
  }
  if (o.siege) {
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(10, -6, 16, 5);
    ctx.fillRect(22, -12, 4, 14);
  }
  if (!o.skirt) {
    limb(ctx, -4, -2, -5 + walk * 4, o.short ? 8 : 12, o.pants);
    limb(ctx, 4, -2, 5 - walk * 4, o.short ? 8 : 12, o.pants);
  } else {
    box(ctx, -11, -8, 22, 18, 6, o.tunic);
  }
  box(ctx, -11, -24, 22, 18, 6, o.tunic);
  ctx.fillStyle = "#e6c56a";
  ctx.fillRect(-11, -10, 22, 3);
  circ(ctx, 0, -32, 8, o.skin);
  ctx.fillStyle = o.hair;
  ctx.beginPath();
  ctx.arc(0, -34, 8.2, Math.PI, 0);
  ctx.fill();
  if (o.beard) { ctx.fillStyle = o.hair; ctx.fillRect(-5, -28, 10, 8); }
  if (o.ears) { circ(ctx, -9, -32, 2, o.skin); circ(ctx, 9, -32, 2, o.skin); }
  if (o.hood) { ctx.fillStyle = o.cape; ctx.beginPath(); ctx.arc(0, -34, 10, Math.PI * 1.05, -0.05); ctx.fill(); }
  if (o.helm) {
    ctx.fillStyle = o.helm;
    ctx.beginPath();
    ctx.arc(0, -35, 9, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#1b2030";
    ctx.stroke();
  }
  if (o.halo) {
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -44, 8, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-4.5, -34, 2.2, 2.2);
  ctx.fillRect(2, -34, 2.2, 2.2);
  if (o.weapon === "bow") {
    ctx.strokeStyle = "#6b4a2a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, -18, 10, -1.2, 1.2);
    ctx.stroke();
  } else if (o.weapon === "hammer") {
    ctx.fillStyle = "#8d8d96";
    ctx.fillRect(12, -28, 8, 8);
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(15, -20, 2, 16);
  } else if (o.weapon === "axe") {
    ctx.fillStyle = "#d5dbe6";
    ctx.beginPath();
    ctx.moveTo(14, -30); ctx.lineTo(24, -22); ctx.lineTo(14, -14); ctx.fill();
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(14, -28, 2, 18);
  } else if (o.weapon === "hook") {
    ctx.strokeStyle = "#6d7a48";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -8);
    ctx.quadraticCurveTo(24, -20, 20, -30);
    ctx.stroke();
  } else if (o.weapon === "sword") {
    ctx.fillStyle = "#d5dbe6";
    ctx.fillRect(12, -30, 3, 16);
    ctx.fillStyle = "#e6c56a";
    ctx.fillRect(10, -16, 7, 3);
  } else if (o.weapon === "staff") {
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(13, -36, 2, 28);
    circ(ctx, 14, -38, 4, "#7ddea2");
  }
  if (o.gun) {
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(-8, 2, 18, 8);
    ctx.fillStyle = "#c4843a";
    ctx.fillRect(4, -2, 14, 6);
  }
}
function paintGhoul(ctx, walk) {
  limb(ctx, -6, -4, -12, 6 + walk * 2, "#67a83a");
  limb(ctx, 6, -4, 12, 6 - walk * 2, "#67a83a");
  limb(ctx, -4, 2, -4 + walk * 3, 12, "#3e6a28");
  limb(ctx, 4, 2, 4 - walk * 3, 12, "#3e6a28");
  oval(ctx, 0, -10, 11, 12, "#7dba4a");
  circ(ctx, 2, -24, 9, "#8bc85a");
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-2, -25, 2.4, 0, 7); ctx.arc(3, -25, 2.4, 0, 7); ctx.fill();
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-2, -26, 2, 2); ctx.fillRect(3, -26, 2, 2);
}
function paintSkeleton(ctx, walk) {
  limb(ctx, -4, 0, -4 + walk * 4, 12, "#e7e1d2");
  limb(ctx, 4, 0, 4 - walk * 4, 12, "#e7e1d2");
  box(ctx, -8, -16, 16, 16, 4, "#f4f0e6");
  ctx.strokeStyle = "#c8c2b4";
  ctx.beginPath();
  ctx.moveTo(-5, -12); ctx.lineTo(5, -12);
  ctx.moveTo(-5, -8); ctx.lineTo(5, -8);
  ctx.stroke();
  circ(ctx, 0, -24, 8, "#f7f3ea");
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-4, -26, 3, 3); ctx.fillRect(2, -26, 3, 3);
  ctx.fillStyle = "#d5dbe6";
  ctx.fillRect(10, -28, 3, 16);
}
function paintBrute(ctx, walk, apron) {
  limb(ctx, -8, 0, -10 + walk * 3, 14, "#6d7a48");
  limb(ctx, 8, 0, 10 - walk * 3, 14, "#6d7a48");
  oval(ctx, 0, -12, 16, 16, "#8d9a62");
  if (apron) { ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-10, -8, 20, 16); }
  ctx.strokeStyle = "#3e4630";
  ctx.beginPath();
  ctx.moveTo(-8, -16); ctx.lineTo(-2, -8);
  ctx.moveTo(6, -6); ctx.lineTo(12, -14);
  ctx.stroke();
  circ(ctx, 0, -30, 8, "#9aaa72");
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-4, -32, 2, 2); ctx.fillRect(2, -32, 2, 2);
  ctx.strokeStyle = "#5c564c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(12, -16);
  ctx.quadraticCurveTo(22, -6, 16, 6);
  ctx.stroke();
}
function paintGargoyle(ctx, flap) {
  var w = flap * 8;
  ctx.fillStyle = "#9aa4b5";
  ctx.beginPath();
  ctx.moveTo(-4, -12); ctx.lineTo(-26, -24 - w); ctx.lineTo(-16, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, -12); ctx.lineTo(26, -24 - w); ctx.lineTo(16, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  oval(ctx, 0, -8, 10, 12, "#b0b8c6");
  circ(ctx, 0, -22, 7, "#c5ccd6");
  ctx.fillStyle = "#7ec8ee";
  ctx.fillRect(-4, -24, 2, 2); ctx.fillRect(2, -24, 2, 2);
  ctx.fillStyle = "#6d7584";
  ctx.beginPath(); ctx.moveTo(-4, -28); ctx.lineTo(-1, -22); ctx.lineTo(-7, -22); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, -28); ctx.lineTo(7, -22); ctx.lineTo(1, -22); ctx.fill();
}
function paintWolf(ctx, walk) {
  limb(ctx, -8, 0, -10 + walk * 3, 10, "#5c6370");
  limb(ctx, -2, 0, -1 - walk * 3, 10, "#5c6370");
  limb(ctx, 6, 0, 8 + walk * 2, 10, "#5c6370");
  limb(ctx, 10, -2, 12 - walk * 2, 10, "#5c6370");
  oval(ctx, 0, -6, 14, 7, "#6d7380");
  circ(ctx, 14, -12, 6, "#7a828e");
  ctx.fillStyle = "#d7dee8";
  ctx.beginPath(); ctx.moveTo(10, -16); ctx.lineTo(8, -22); ctx.lineTo(14, -16); ctx.fill();
  ctx.beginPath(); ctx.moveTo(16, -16); ctx.lineTo(18, -22); ctx.lineTo(20, -14); ctx.fill();
  ctx.fillStyle = "#9fd7ff";
  ctx.fillRect(16, -14, 2, 2);
  ctx.strokeStyle = "#5c6370";
  ctx.beginPath(); ctx.moveTo(-12, -6); ctx.quadraticCurveTo(-20, -10 + walk * 2, -16, -2); ctx.stroke();
}
function paintBanshee(ctx, walk) {
  ctx.fillStyle = "rgba(140,230,230,.85)";
  ctx.beginPath();
  ctx.moveTo(-10, -28);
  ctx.quadraticCurveTo(-16, 0, -8 + walk * 4, 12);
  ctx.lineTo(8 + walk * 3, 12);
  ctx.quadraticCurveTo(16, -4, 8, -28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1b2030";
  ctx.stroke();
  circ(ctx, 0, -24, 7, "#e9ffff");
  ctx.fillStyle = "#1b6a6a";
  ctx.fillRect(-3, -26, 2, 3); ctx.fillRect(2, -26, 2, 3);
}
function paintNaga(ctx, walk) {
  ctx.fillStyle = "#3e8fbf";
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.quadraticCurveTo(18, 2, walk * 6, 14);
  ctx.quadraticCurveTo(-4, 10, 6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  box(ctx, -10, -24, 18, 16, 6, "#2f6f9a");
  circ(ctx, 0, -32, 7, "#7ec0e0");
  ctx.fillStyle = "#e6c56a";
  ctx.fillRect(10, -30, 3, 14);
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-3, -34, 2, 2); ctx.fillRect(2, -34, 2, 2);
}
function paintFrost(ctx) {
  ctx.fillStyle = "#bfe6f6";
  ctx.beginPath();
  ctx.moveTo(0, -40); ctx.lineTo(14, -8); ctx.lineTo(-14, -8); ctx.closePath();
  ctx.fill(); ctx.stroke();
  box(ctx, -12, -10, 24, 16, 4, "#9fd4ee");
  circ(ctx, 0, -16, 7, "#e7f7ff");
  ctx.fillStyle = "#1b4a66";
  ctx.fillRect(-3, -18, 2, 2); ctx.fillRect(2, -18, 2, 2);
}
function paintWyrm(ctx, walk) {
  ctx.fillStyle = "#7ec8ee";
  for (var i = 0; i < 4; i++) oval(ctx, -16 + i * 10, Math.sin(walk + i) * 3, 8, 6, i % 2 ? "#9fd8f2" : "#6eb8de");
  var w = walk * 8;
  ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(24, -18 - w); ctx.lineTo(16, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  circ(ctx, 18, -8, 7, "#e7f6ff");
  ctx.fillStyle = "#1b4a66";
  ctx.fillRect(20, -10, 2, 2);
  ctx.fillStyle = "#d7e6f4";
  ctx.beginPath(); ctx.moveTo(16, -14); ctx.lineTo(20, -20); ctx.lineTo(22, -12); ctx.fill();
}
function paintScarab(ctx, walk) {
  oval(ctx, 0, -8, 11, 6, "#c4a15a");
  oval(ctx, -9, -5, 4, 2.4, "#8a6230");
  oval(ctx, 9, -5, 4, 2.4, "#8a6230");
  ctx.strokeStyle = "#1b2030";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, -12); ctx.lineTo(-7, -18 - walk * 3);
  ctx.moveTo(3, -12); ctx.lineTo(7, -18 - walk * 3);
  ctx.stroke();
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-3, -10, 2, 2); ctx.fillRect(2, -10, 2, 2);
}
function paintAnub(ctx, walk) {
  var leg = walk * 3;
  oval(ctx, 0, -8, 16, 9, "#6a5030");
  oval(ctx, 0, -18, 14, 7, "#c4a06a");
  ctx.fillStyle = "#3e2e1c";
  ctx.fillRect(-14, -6, 4, 12 + leg);
  ctx.fillRect(10, -6, 4, 12 - leg);
  ctx.fillRect(-5, 0, 3, 12);
  ctx.fillRect(2, 0, 3, 12);
  ctx.strokeStyle = "#1b2030";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -20); ctx.lineTo(-16, -8);
  ctx.moveTo(5, -20); ctx.lineTo(16, -8);
  ctx.stroke();
  ctx.fillStyle = "#ffe08a";
  ctx.fillRect(-4, -20, 2, 2); ctx.fillRect(3, -20, 2, 2);
}
function paintDread(ctx, walk) {
  var w = walk * 6;
  ctx.fillStyle = "#6a4ad0";
  ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(-24, -28 - w); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, -10); ctx.lineTo(24, -28 - w); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  box(ctx, -12, -22, 24, 20, 6, "#5a32b0");
  circ(ctx, 0, -32, 8, "#c9b6f0");
  ctx.fillStyle = "#3a1868";
  ctx.beginPath(); ctx.moveTo(-6, -38); ctx.lineTo(-2, -30); ctx.lineTo(-9, -30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -38); ctx.lineTo(9, -30); ctx.lineTo(2, -30); ctx.fill();
  ctx.fillStyle = "#ffe08a";
  ctx.fillRect(-4, -34, 2, 2); ctx.fillRect(2, -34, 2, 2);
}
function paintKel(ctx, walk) {
  ctx.fillStyle = "#4a2e86";
  ctx.beginPath();
  ctx.moveTo(-12, -20);
  ctx.lineTo(-14, 12);
  ctx.lineTo(14, 12);
  ctx.lineTo(12, -20);
  ctx.fill(); ctx.stroke();
  circ(ctx, 0, -28, 8, "#f4f0e6");
  ctx.fillStyle = "#2a1848";
  ctx.beginPath(); ctx.arc(0, -34, 10, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(-4, -30, 3, 3); ctx.fillRect(2, -30, 3, 3);
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(12, -36, 2, 28);
  circ(ctx, 13, -38, 4, "#7ec8ee");
  ctx.fillStyle = "#e6c56a";
  ctx.fillRect(-8, -4, 16, 3);
  if (walk) { /* robe hem stays still */ }
}
function paintLich(ctx, walk) {
  ctx.fillStyle = "#16324a";
  ctx.beginPath();
  ctx.moveTo(-8, -24);
  ctx.quadraticCurveTo(-20, 0, -12 + walk, 14);
  ctx.lineTo(12, 14);
  ctx.quadraticCurveTo(16, -4, 8, -24);
  ctx.fill();
  box(ctx, -14, -26, 28, 22, 6, "#2a4a66");
  ctx.fillStyle = "#9fd0ee";
  ctx.fillRect(-14, -18, 28, 4);
  circ(ctx, 0, -36, 9, "#d7e4ee");
  ctx.fillStyle = "#7ec8ee";
  ctx.beginPath(); ctx.arc(0, -40, 10, Math.PI, 0); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e7f7ff";
  ctx.fillRect(-5, -38, 3, 3); ctx.fillRect(2, -38, 3, 3);
  ctx.fillStyle = "#bfe6f6";
  ctx.fillRect(14, -34, 3, 18);
}
function paintGryphon(ctx, flap) {
  var wing = Math.sin(flap) * 10;
  ctx.fillStyle = "#c9853a";
  ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-26, -26 - wing); ctx.lineTo(-14, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, -14); ctx.lineTo(26, -26 - wing); ctx.lineTo(14, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
  oval(ctx, 0, -8, 12, 8, "#e2b56a");
  circ(ctx, 12, -16, 6, "#f7f1e4");
  ctx.fillStyle = "#e6a23a";
  ctx.beginPath(); ctx.moveTo(16, -16); ctx.lineTo(24, -14); ctx.lineTo(16, -12); ctx.fill();
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(13, -18, 2, 2);
  limb(ctx, -4, 0, -6, 8, "#e6a23a");
  limb(ctx, 4, 0, 6, 8, "#e6a23a");
  ctx.fillStyle = "#e6c56a";
  ctx.fillRect(-6, -12, 8, 4);
}

function drawPortrait(canvasId, fig) {
  var c = document.getElementById(canvasId);
  if (!c) return;
  var ctx = c.getContext("2d");
  var bob = Math.sin(G.time * 2) * 3;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(6, 6, 168, 188, 16);
  ctx.clip();
  ctx.fillStyle = "#121a2c";
  ctx.fillRect(0, 0, c.width, c.height);
  if (iconReady("story:" + fig)) ctx.drawImage(ICONS["story:" + fig], 6, 14 + bob, 168, 168);
  else drawChibi(ctx, fig, 90, 172 + bob, 2.5, { phase: G.time });
  ctx.restore();
}

var last = 0;
function frame(now) {
  var dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
  last = now;
  try {
    if (G.screen === "play") {
      update(dt * (G.speed || 1));
      render();
      tickHUD();
    } else if (G.screen === "story") {
      G.time += dt;
      drawPortrait("story-portrait", G.storyFig);
    } else if (G.screen === "result") {
      G.time += dt;
      drawPortrait("result-portrait", G.resultFig);
    }
  } catch (err) {
    console.error(err);
  }
  requestAnimationFrame(frame);
}

document.addEventListener("DOMContentLoaded", boot);
