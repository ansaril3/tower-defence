/* Campaign data for a kid-friendly Lordaeron tower defence. */
var Campaign = (function () {
  function g(type, count, every, delay) {
    return { type: type, count: count, every: every == null ? 0.9 : every, delay: delay || 0 };
  }
  function w(bonus, groups) {
    return { bonus: bonus, groups: groups };
  }

  var DIFF = {
    easy: { id: "easy", name: "Страж", line: "Больше золота и жизней, враги тише.", hp: 0.72, spd: 0.9, gold: 1.22, reward: 1.18, lives: 24, gap: 1.12, rank: 1 },
    normal: { id: "normal", name: "Рыцарь", line: "Честный поход: думай, кого ставить у дороги.", hp: 1, spd: 1, gold: 1, reward: 1, lives: 18, gap: 1, rank: 2 },
    hard: { id: "hard", name: "Герой", line: "Мало жизней, волны злее и быстрее.", hp: 1.4, spd: 1.12, gold: 0.86, reward: 0.9, lives: 12, gap: 0.9, rank: 3 }
  };

  var MATRIX = {
    pierce: { light: 1.4, medium: 1, heavy: 0.72, hero: 0.55 },
    magic: { light: 1.05, medium: 1.2, heavy: 1.28, hero: 1.18 },
    siege: { light: 0.62, medium: 0.95, heavy: 1.5, hero: 1.6 }
  };

  var ORDER = ["drow", "jugg", "cm", "zeus", "axe", "sniper", "wr", "frostlich", "ursa", "pudge", "qop", "necrofos", "visage", "techies", "tide"];

  var TOWERS = {
    drow: {
      name: "Тракса", unlock: 1, cost: 60, up: [50, 80], attack: "arrow",
      blurb: "Морозные стрелы. Быстро, и по земле, и по небу.",
      good: "Лучшая против шустрых и летающих.",
      fight: "range", phase: "start",
      pick: "Бери первой: дёшево, быстро, достаёт и землю, и небо.",
      role: "pierce", air: "yes", airBonus: 1.35, color: "#8aa0b8",
      levels: [
        { dmg: 12, cd: 0.52, range: 142, shots: 1, text: "Одна меткая стрела." },
        { dmg: 18, cd: 0.46, range: 158, shots: 1, text: "Стреляет быстрее и больнее." },
        { dmg: 16, cd: 0.4, range: 170, shots: 2, text: "Две стрелы за залп!" }
      ]
    },
    jugg: {
      name: "Джаггернаут", unlock: 1, cost: 85, up: [70, 100], attack: "spin",
      blurb: "Крутится клинком и режет всех на земле рядом.",
      good: "Толпа на тропе. В небо не достаёт.",
      fight: "melee", phase: "start",
      pick: "Ставь у поворота, где толпа сбивается в кучу.",
      role: "siege", air: "no", color: "#c4553a",
      levels: [
        { dmg: 20, cd: 1.05, range: 108, splash: 108, text: "Вихрь по кругу." },
        { dmg: 32, cd: 0.95, range: 120, splash: 120, text: "Круг шире и больнее." },
        { dmg: 46, cd: 0.84, range: 132, splash: 132, text: "Огромный клинок-вихрь!" }
      ]
    },
    cm: {
      name: "Кристалка", unlock: 2, cost: 100, up: [75, 110], attack: "nova",
      blurb: "Морозит цель и всех рядом с ней.",
      good: "Тормозит толпу, бьёт и небо.",
      fight: "range", phase: "start",
      pick: "Рядом с Траксой: мороз держит тех, кого стрелы не добили.",
      role: "magic", air: "yes", color: "#9fd4ee",
      levels: [
        { dmg: 14, cd: 1.15, range: 132, splash: 72, slow: 0.3, text: "Мороз вокруг цели." },
        { dmg: 22, cd: 1.05, range: 142, splash: 84, slow: 0.38, text: "Холод держится дольше." },
        { dmg: 32, cd: 0.94, range: 152, splash: 96, slow: 0.46, text: "Метель на всю тропу." }
      ]
    },
    zeus: {
      name: "Зевс", unlock: 2, cost: 115, up: [80, 120], attack: "chain",
      blurb: "Молния прыгает с врага на врага.",
      good: "Толпа и те, кто в небе.",
      fight: "range", phase: "start",
      pick: "Когда врагов много и они идут пачкой, в том числе по небу.",
      role: "magic", air: "yes", color: "#ffe08a",
      levels: [
        { dmg: 18, cd: 1.05, range: 136, bounces: 3, text: "Молния на троих." },
        { dmg: 26, cd: 0.95, range: 148, bounces: 4, text: "Четыре прыжка." },
        { dmg: 36, cd: 0.86, range: 158, bounces: 5, text: "Гроза на пятерых!" }
      ]
    },
    axe: {
      name: "Акс", unlock: 3, cost: 125, up: [90, 130], attack: "call",
      blurb: "Крик останавливает всех рядом и рубит их.",
      good: "Держит толпу на месте. Небо не берёт.",
      fight: "melee", phase: "mid",
      pick: "На узкое место тропы: клич останавливает всю кучу.",
      role: "siege", air: "no", color: "#8a2a22",
      levels: [
        { dmg: 28, cd: 1.35, range: 114, splash: 114, slow: 0.82, text: "Боевой клич." },
        { dmg: 42, cd: 1.2, range: 124, splash: 124, slow: 0.88, text: "Крик громче, круг шире." },
        { dmg: 60, cd: 1.08, range: 134, splash: 134, slow: 0.92, text: "Все замирают!" }
      ]
    },
    sniper: {
      name: "Снайпер", unlock: 3, cost: 140, up: [100, 140], attack: "arrow",
      blurb: "Один далёкий выстрел. Больно и очень далеко.",
      good: "Бьёт через полкарты, и по небу тоже.",
      fight: "range", phase: "mid",
      pick: "Одного хватает: бьёт почти откуда угодно, и небо тоже.",
      role: "pierce", air: "yes", airBonus: 1.15, color: "#6a8a48",
      levels: [
        { dmg: 36, cd: 1.2, range: 240, shots: 1, text: "Дальний выстрел." },
        { dmg: 54, cd: 1.08, range: 268, shots: 1, text: "Ещё дальше и больнее." },
        { dmg: 78, cd: 0.96, range: 296, shots: 1, text: "Почти через всю карту." }
      ]
    },
    wr: {
      name: "Виндраннер", unlock: 4, cost: 145, up: [100, 150], attack: "line",
      blurb: "Силовой выстрел прошивает весь ряд.",
      good: "Прямые тропы и гаргульи.",
      fight: "range", phase: "mid",
      pick: "Ставь так, чтобы выстрел шёл вдоль прямой дороги.",
      role: "pierce", air: "yes", airBonus: 1.45, color: "#3aaa68",
      levels: [
        { dmg: 30, cd: 1.08, range: 210, pierce: 2, text: "Прошивает двоих." },
        { dmg: 44, cd: 0.98, range: 230, pierce: 3, text: "Прошивает троих." },
        { dmg: 58, cd: 0.88, range: 250, pierce: 4, text: "Четверо на одной линии!" }
      ]
    },
    frostlich: {
      name: "Лич", unlock: 4, cost: 150, up: [105, 150], attack: "chain",
      blurb: "Ледяная цепь прыгает и замедляет.",
      good: "Нежить и плотная толпа.",
      fight: "range", phase: "mid",
      pick: "На плотную толпу и нежить: цепь и мороз вместе.",
      role: "magic", air: "yes", color: "#7ec8ee",
      levels: [
        { dmg: 16, cd: 1.1, range: 134, bounces: 3, slow: 0.26, text: "Цепь на троих и мороз." },
        { dmg: 24, cd: 1.0, range: 146, bounces: 4, slow: 0.34, text: "Четыре прыжка." },
        { dmg: 34, cd: 0.9, range: 156, bounces: 5, slow: 0.42, text: "Метель прыгает по всем." }
      ]
    },
    ursa: {
      name: "Урса", unlock: 5, cost: 160, up: [110, 160], attack: "stacks",
      blurb: "Каждый удар по той же цели всё злее.",
      good: "Босс и великаны. В небо не достаёт.",
      fight: "melee", phase: "mid",
      pick: "Копи к боссу и великанам. На мелочь золото жалко.",
      role: "pierce", air: "no", color: "#a86830",
      levels: [
        { dmg: 14, cd: 0.55, range: 118, text: "Ярость копится на цели." },
        { dmg: 20, cd: 0.48, range: 128, text: "Когти быстрее." },
        { dmg: 28, cd: 0.42, range: 136, text: "Босс тает под яростью." }
      ]
    },
    pudge: {
      name: "Пудж", unlock: 5, cost: 165, up: [115, 160], attack: "hook",
      blurb: "Крюк бьёт того, кто ближе к воротам. Рядом все гниют.",
      good: "Ловит тех, кто прорвался. Небо не берёт.",
      fight: "melee", phase: "mid",
      pick: "Ближе к воротам: крюк ловит тех, кто уже прорвался.",
      role: "magic", air: "no", color: "#7a8a48",
      levels: [
        { dmg: 42, cd: 1.35, range: 176, rot: 8, splash: 96, text: "Крюк и гниль рядом." },
        { dmg: 64, cd: 1.2, range: 196, rot: 12, splash: 108, text: "Крюк длиннее." },
        { dmg: 90, cd: 1.08, range: 216, rot: 18, splash: 120, text: "Мясорубка у тропы." }
      ]
    },
    qop: {
      name: "Квопа", unlock: 6, cost: 175, up: [120, 170], attack: "scream",
      blurb: "Крик боли по кругу. Каждый третий крик — волна сквозь ряд.",
      good: "Толпа и небо. Волна бьёт по линии.",
      fight: "melee", phase: "late",
      pick: "Когда золота много: крик чистит круг, волна — весь ряд.",
      role: "magic", air: "yes", color: "#c45ad0",
      levels: [
        { dmg: 18, cd: 0.98, range: 126, splash: 110, text: "Крик по кругу." },
        { dmg: 28, cd: 0.9, range: 136, splash: 122, text: "Круг шире." },
        { dmg: 40, cd: 0.82, range: 146, splash: 134, text: "Ультразвук прошивает ряд." }
      ]
    },
    necrofos: {
      name: "Некрофос", unlock: 6, cost: 180, up: [125, 175], attack: "pulse",
      blurb: "Пульс смерти по кругу и аура, которая грызёт толстых.",
      good: "Великаны и боссы. Бьёт и небо.",
      fight: "melee", phase: "late",
      pick: "На толстых и босса: аура снимает долю жизни, бьёт и небо.",
      role: "magic", air: "yes", color: "#6a8a3a",
      levels: [
        { dmg: 12, cd: 1.15, range: 128, splash: 128, pct: 0.012, text: "Пульс и лёгкая аура." },
        { dmg: 18, cd: 1.05, range: 140, splash: 140, pct: 0.018, text: "Аура грызёт сильнее." },
        { dmg: 26, cd: 0.95, range: 150, splash: 150, pct: 0.024, text: "Толстые тают сами." }
      ]
    },
    visage: {
      name: "Визаж", unlock: 7, cost: 200, up: [140, 190], attack: "birds",
      blurb: "Каменные гаргульи сами летят к цели и возвращаются.",
      good: "Босс и небо. На третьей ступени их двое.",
      fight: "range", phase: "late",
      pick: "Дорого. Гаргульи сами догоняют босса и тех, кто в небе.",
      role: "pierce", air: "yes", airBonus: 1.25, bossBonus: 1.3, color: "#8a9098",
      levels: [
        { dmg: 44, cd: 0.32, range: 164, birds: 1, fly: 250, text: "Одна гаргулья." },
        { dmg: 66, cd: 0.26, range: 178, birds: 1, fly: 310, text: "Быстрее возвращается." },
        { dmg: 54, cd: 0.22, range: 190, birds: 2, fly: 330, text: "Уже двое!" }
      ]
    },
    techies: {
      name: "Техиз", unlock: 8, cost: 165, up: [110, 150], attack: "mine",
      blurb: "Кладёт мину на тропу. Враг наступает — взрыв.",
      good: "Толпа на земле. Небо мина не берёт.",
      fight: "melee", phase: "late",
      pick: "Мины на прямой участок, где враги идут пачкой. Небо не берёт.",
      role: "siege", air: "no", color: "#d24a3a",
      levels: [
        { dmg: 72, cd: 1.55, range: 160, splash: 62, text: "Мина на тропе." },
        { dmg: 112, cd: 1.38, range: 172, splash: 72, text: "Взрыв шире." },
        { dmg: 160, cd: 1.22, range: 184, splash: 84, text: "Большая мина!" }
      ]
    },
    tide: {
      name: "Тайдхантер", unlock: 9, cost: 210, up: [150, 200], attack: "ravage",
      blurb: "Бьёт якорем по земле. Иногда — Реведж: огромный круг, все замирают.",
      good: "Толпа и босс у ворот. Реведж бьёт даже небо.",
      fight: "melee", phase: "late",
      pick: "Береги к концу главы. Реведж — когда босс уже у ворот.",
      role: "siege", air: "no", color: "#1a6a90",
      levels: [
        { dmg: 38, cd: 1.25, range: 132, splash: 70, ult: 96, ultR: 168, ultCd: 9, text: "Якорь и редкий Реведж." },
        { dmg: 56, cd: 1.12, range: 142, splash: 80, ult: 140, ultR: 186, ultCd: 8, text: "Реведж чаще и шире." },
        { dmg: 78, cd: 1.02, range: 152, splash: 90, ult: 200, ultR: 210, ultCd: 7, text: "Волна смывает тропу." }
      ]
    }
  };

  var ITEM_ORDER = ["boots", "crystal", "bfury", "mael", "skadi", "deso", "radiance"];
  var ITEMS = {
    boots: {
      name: "Сапоги", cost: 45, color: "#e6c56a", blurb: "Герой бьёт заметно быстрее.",
      lane: "all", phase: "start",
      pick: "Первая вещь почти любому. Чаще бьёт — больше урона за ту же цену.",
      stats: ["Перезарядка удара −28%"]
    },
    crystal: {
      name: "Кристалис", cost: 70, color: "#9ec0ff", blurb: "Все удары сильнее.",
      lane: "all", phase: "start",
      pick: "Вторая вещь, если удар и так попадает. Радианс этот бонус не получает.",
      stats: ["Урон +35%"]
    },
    bfury: {
      name: "Топор", cost: 95, color: "#ffb15a", blurb: "Обычный удар ранит соседей. Боевой топор.",
      lane: "hit", phase: "mid",
      pick: "Только меткий удар: Тракса, Снайпер, Виндраннер, Урса, Пудж, Визаж. Небо топор не берёт.",
      stats: ["Соседи на земле получают 50% урона", "Радиус 58"]
    },
    mael: {
      name: "Мьеллнир", cost: 85, color: "#ffe08a", blurb: "Иногда молния прыгает на соседей.",
      lane: "hit", phase: "mid",
      pick: "Туда же, где одиночная цель. На вихре, крике и мине молния не прыгает.",
      stats: ["Шанс 30%: молния на соседей", "45% урона, до двух целей"]
    },
    skadi: {
      name: "Скади", cost: 75, color: "#9fd4ee", blurb: "Атаки замедляют.",
      lane: "all", phase: "mid",
      pick: "На того, кто часто задевает толпу: Кристалка, Акс, Джаггернаут. Волки добегают медленнее.",
      stats: ["Замедление 34% на 1.5 с"]
    },
    deso: {
      name: "Дезолятор", cost: 80, color: "#c45a6a", blurb: "Цель становится мягче: по ней бьют все.",
      lane: "all", phase: "mid",
      pick: "На героя, который бьёт босса первым. После него все по этой цели бьют сильнее.",
      stats: ["По цели бьют на 28% сильнее", "Держится 2.6 с"]
    },
    radiance: {
      name: "Радианс", cost: 120, color: "#ffd56a", blurb: "Жжёт всех рядом, даже без атаки.",
      lane: "path", phase: "late",
      pick: "На того, кто стоит у поворота. Жжёт сам, даже небо. Кристалис жар не усиливает.",
      stats: ["22 урона в секунду рядом", "Радиус 108, даже по небу"]
    }
  };

  var ENEMIES = {
    ghoul: { name: "Вурдалак", hp: 74, speed: 66, armor: "light", gold: 5, leak: 1, scale: 1, undead: true, color: "#7dba4a" },
    skeleton: { name: "Скелет", hp: 120, speed: 46, armor: "medium", gold: 6, leak: 1, scale: 1, undead: true, color: "#e7e1d2" },
    abom: { name: "Сшитый великан", hp: 740, speed: 30, armor: "heavy", gold: 22, leak: 2, scale: 1.28, undead: true, color: "#8d9a62" },
    gargoyle: { name: "Гаргулья", hp: 124, speed: 74, armor: "light", gold: 11, leak: 1, scale: 1.05, undead: true, flying: true, color: "#9aa4b5" },
    wolf: { name: "Чумной волк", hp: 82, speed: 104, armor: "light", gold: 8, leak: 1, scale: 1.05, undead: false, color: "#6d7380" },
    necro: { name: "Некромант", hp: 176, speed: 36, armor: "medium", gold: 14, leak: 1, scale: 1.08, undead: true, color: "#7a5bd6" },
    banshee: { name: "Банши", hp: 132, speed: 58, armor: "medium", gold: 12, leak: 1, scale: 1.05, undead: true, flying: true, color: "#8ee0e0", pierceMul: 0.45, magicMul: 1.28 },
    naga: { name: "Нага", hp: 236, speed: 42, armor: "heavy", gold: 13, leak: 1, scale: 1.1, undead: false, color: "#3e8fbf", magicMul: 0.8 },
    frost: { name: "Ледяной великан", hp: 500, speed: 34, armor: "heavy", gold: 18, leak: 2, scale: 1.24, undead: false, color: "#9fd4ee" },
    wyrm: { name: "Ледяной змей", hp: 1680, speed: 34, armor: "hero", gold: 48, leak: 3, scale: 1.5, undead: true, flying: true, boss: true, ai: "none", color: "#7ec8ee", intro: "Он в небе. Вихрь, клич и мины мимо — бей стрелами, молнией и гаргульями." },
    malganis: { name: "Мал'Ганис", hp: 1200, speed: 24, armor: "hero", gold: 110, leak: 5, scale: 1.72, undead: true, flying: true, boss: true, ai: "dread", color: "#8b6cff", intro: "Он в небе. Вихрь и клич мимо — бей Траксой, Зевсом и Снайпером." },
    butcher: { name: "Мясник", hp: 2700, speed: 27, armor: "heavy", gold: 110, leak: 5, scale: 1.78, undead: true, boss: true, ai: "butcher", color: "#9aaa62", intro: "Очень толстый. Урса копит ярость, Джаггернаут рубит кругом." },
    kel: { name: "Кел'Тузед", hp: 3000, speed: 30, armor: "hero", gold: 130, leak: 5, scale: 1.62, undead: true, boss: true, ai: "kel", color: "#b08cff", intro: "Морозит ближних героев. Не ставь всех в одну кучу." },
    lich: { name: "Король-лич", hp: 4800, speed: 28, armor: "hero", gold: 220, leak: 8, scale: 1.9, undead: true, boss: true, ai: "lich", color: "#8fd0ff", intro: "Три стадии. Береги рог к самому концу." }
  };

  var TIPS = {
    abom: "Великан медленный, но очень толстый.",
    gargoyle: "Гаргулья в небе! Пушка её не берёт.",
    wolf: "Волки очень быстрые — лови их на поворотах.",
    banshee: "Банши почти не боятся стрел. Нужны молния и крик.",
    necro: "Некромант после гибели зовёт скелетов.",
    frost: "Ледяной великан морозит героев рядом с собой.",
    naga: "У наг толстая чешуя. Пушка поможет."
  };

  var LEVELS = [
    {
      id: 1, short: "Хилсбрад", name: "Хилсбрадская застава", biome: "hillsbrad", exit: "gate", hp: 1, gold: 180,
      hint: [7, 4], ponds: [[13, 7], [14, 7], [14, 8], [12, 8]],
      path: [[0, 2], [6, 2], [6, 7], [11, 7], [11, 3], [15, 3]],
      before: { who: "Капитан стражи", fig: "guard", text: "Ночь над Хилсбрадом. По тракту едут пустые телеги, а в канавах шевелится туман. Король Теренас просит удержать мост, пока семьи уходят к столице." },
      after: { who: "Утер Светоносный", fig: "uther", text: "Мост цел, беженцы в безопасности. Утер снимает шлем: «Это Плеть. Тракса стережёт небо стрелами, Джаггернаут крутит толпу на земле»." }
    },
    {
      id: 2, short: "Чумной лес", name: "Чумной лес", biome: "plague", exit: "gate", hp: 1.05, gold: 230,
      hint: [5, 3], ponds: [[1, 8], [2, 8], [14, 3]],
      path: [[0, 1], [4, 1], [4, 5], [9, 5], [9, 1], [13, 1], [13, 8], [15, 8]],
      before: { who: "Утер Светоносный", fig: "uther", text: "Деревья Серебряного бора почернели, но мы не отступим. Кристалка морозит толпу. Зевс бьёт молнией сразу нескольких — и тех, кто в небе." },
      after: { who: "Утер Светоносный", fig: "uther", text: "Лес затих. Впереди врата столицы. Там Акс остановит толпу криком, а Снайпер достанет врага через полкарты." }
    },
    {
      id: 3, short: "Врата столицы", name: "Врата Лордерона", biome: "city", exit: "gate", hp: 1.08, gold: 300,
      hint: [9, 4], ponds: [[1, 1], [14, 8], [15, 8]],
      path: [[0, 5], [3, 5], [3, 2], [8, 2], [8, 6], [12, 6], [12, 3], [15, 3]],
      before: { who: "Мурадин", fig: "muradin", text: "Слушай, командир. Акс держит великанов на месте, но в небо не достаёт. Мал'Ганис кружит над воротами — его берут Тракса, Зевс и Снайпер. В город ему нельзя." },
      after: { who: "Король Теренас", fig: "guard", text: "Мал'Ганис срывается с башен и шипит, что Ледяной Трон всё равно ждёт. Король Теренас машет с стены: столица устояла. Эльфы Кель'Таласа зовут на помощь." }
    },
    {
      id: 4, short: "Луносвет", name: "Леса Луносвета", biome: "elf", exit: "sun", hp: 1.12, gold: 290,
      hint: [4, 6], ponds: [[14, 7], [15, 7], [15, 8], [0, 2]],
      path: [[0, 8], [3, 8], [3, 4], [7, 4], [7, 8], [11, 8], [11, 3], [15, 3]],
      before: { who: "Аллерия", fig: "alleria", text: "Я Аллерия, следопыт Кель'Таласа. Гаргульи садятся на наши крыши. Виндраннер прошивает ряд насквозь, даже в небе. Лич морозит цепочкой." },
      after: { who: "Аллерия", fig: "alleria", text: "Солнечный колодец снова светит ровно. Аллерия даёт проводника через горы Альтерака, к фиолетовым башням Даларана." }
    },
    {
      id: 5, short: "Альтерак", name: "Перевал Альтерака", biome: "snow", exit: "gate", hp: 1.16, gold: 310,
      hint: [6, 6], ponds: [],
      path: [[0, 1], [5, 1], [5, 4], [1, 4], [1, 8], [8, 8], [8, 3], [12, 3], [12, 7], [15, 7]],
      before: { who: "Мурадин", fig: "muradin", text: "Перевал узкий, а чумные волки быстрые. В конце — Мясник. Урса копит ярость на одной толстой цели. Пудж крюком ловит того, кто уже у ворот." },
      after: { who: "Фалстад", fig: "falstad", text: "Перевал наш. Фалстад машет с неба: каменные гаргульи Визажа ещё в пути. Сначала — шпили Даларана." }
    },
    {
      id: 6, short: "Даларан", name: "Окраина Даларана", biome: "dalaran", exit: "portal", hp: 1.2, gold: 330,
      hint: [8, 3], ponds: [[2, 6], [3, 6]],
      path: [[0, 4], [4, 4], [4, 1], [12, 1], [12, 8], [6, 8], [6, 5], [15, 5]],
      before: { who: "Джайна", fig: "jaina", text: "Я Джайна Праудмур. Банши почти не боятся стрел. Квопа кричит по кругу, Некрофос грызёт толстых аурой. Некроманты после гибели зовут скелетов." },
      after: { who: "Джайна", fig: "jaina", text: "Внешнее кольцо чистое. Из цитадели тянет могильным холодом: там Кел'Тузед читает свою книгу. Визаж уже выпускает гаргулий." }
    },
    {
      id: 7, short: "Цитадель", name: "Аметистовая цитадель", biome: "violet", exit: "portal", hp: 1.24, gold: 390,
      hint: [6, 4], ponds: [[14, 6], [15, 6], [0, 8]],
      path: [[0, 2], [5, 2], [5, 7], [11, 7], [11, 2], [15, 2]],
      before: { who: "Фалстад", fig: "falstad", text: "Гаргульи Визажа сами догоняют цель и возвращаются. На третьей ступени их двое. Кел'Тузед морозит героев рядом с собой. Не ставь всех в одну кучу." },
      after: { who: "Джайна", fig: "jaina", text: "Посох лича гаснет. Кел'Тузед шепчет про Нордскол. Джайна открывает портал на Драконий погост. Принц Артас стоит рядом и не отводит глаз от севера." }
    },
    {
      id: 8, short: "Погост", name: "Драконий погост", biome: "northrend", exit: "gate", hp: 1.3, gold: 370,
      hint: [4, 5], ponds: [[13, 5], [14, 5], [14, 6]],
      path: [[0, 8], [2, 8], [2, 3], [7, 3], [7, 8], [11, 8], [11, 2], [15, 2]],
      before: { who: "Артас", fig: "arthas", text: "Я Артас, принц Лордерона. Ледяные великаны замедляют героев рядом. Техies минирует тропу. Смешай Визажа, Некрофоса и тех, кто бьёт по земле." },
      after: { who: "Артас", fig: "arthas", text: "Погост пройден. Впереди Ледяная Корона — лестница к трону. Утер присылает письмо: «На змея рог не жалей»." }
    },
    {
      id: 9, short: "Ледяная Корона", name: "Подъём Ледяной Короны", biome: "icecrown", exit: "gate", hp: 1.36, gold: 400,
      hint: [4, 5], ponds: [],
      path: [[0, 1], [6, 1], [6, 4], [2, 4], [2, 7], [8, 7], [8, 3], [13, 3], [13, 8], [15, 8]],
      before: { who: "Утер Светоносный", fig: "uther", text: "На подъёме вас встретит ледяной змей. Он огромный и летает: вихрь, клич и мины его не берут. Тракса, Виндраннер, Зевс и Визаж — да. Тайдхантер смывает Реведжем даже небо." },
      after: { who: "Артас", fig: "arthas", text: "Змей падает в трещину, и на миг становится тихо. Слишком тихо. Впереди зал Ледяного Трона. Артас кладёт руку тебе на плечо: «Если шлем заговорит — бей по льду»." }
    },
    {
      id: 10, short: "Ледяной Трон", name: "Ледяной Трон", biome: "icecrown", exit: "throne", hp: 1.42, gold: 470,
      hint: [8, 3], ponds: [],
      path: [[0, 9], [15, 9], [15, 0], [1, 0], [1, 5], [8, 5]],
      before: { who: "Артас", fig: "arthas", text: "Голос в шлеме называет меня королём мёртвых. Я не согласен. Держи зал, командир. Когда лёд треснет — мы поедем домой, к отцу. Рог прибереги для ярости в конце." },
      after: { who: "Артас", fig: "arthas", text: "Шлем раскалывается, как весенний лёд на реке. Голос стихает. Артас снимает перчатку и смеётся — живой. Даларан открывает порталы домой: Хилсбрад, столица, Луносвет зажигают огни. Король Теренас встречает вас у ворот. «Лордерон устоял, потому что вы не пустили тьму дальше тропы»." }
    }
  ];

  LEVELS.forEach(function (lv, i) {
    var waves = [];
    if (i === 0) {
      waves = [
        w(22, [g("ghoul", 6, 1.05)]),
        w(26, [g("ghoul", 8, 0.85)]),
        w(30, [g("ghoul", 5, 0.9), g("skeleton", 3, 1.1, 1.5)]),
        w(32, [g("skeleton", 7, 0.95)]),
        w(36, [g("ghoul", 10, 0.5)]),
        w(40, [g("skeleton", 5, 0.8), g("ghoul", 6, 0.7, 1)]),
        w(50, [g("abom", 1, 1, 0.6), g("ghoul", 6, 0.75, 1.2)])
      ];
    } else if (i === 1) {
      waves = [
        w(26, [g("skeleton", 6, 0.9)]),
        w(30, [g("ghoul", 8, 0.7), g("skeleton", 4, 1, 1)]),
        w(32, [g("skeleton", 10, 0.75)]),
        w(36, [g("abom", 1, 1, 0.4), g("ghoul", 8, 0.65)]),
        w(40, [g("ghoul", 12, 0.42)]),
        w(42, [g("skeleton", 8, 0.7), g("abom", 1, 1, 2)]),
        w(44, [g("skeleton", 6, 0.7), g("ghoul", 8, 0.55)]),
        w(56, [g("abom", 2, 2.4), g("skeleton", 8, 0.7, 1)])
      ];
    } else if (i === 2) {
      waves = [
        w(30, [g("skeleton", 6, 0.8), g("ghoul", 6, 0.7)]),
        w(34, [g("abom", 1, 1, 0.3), g("skeleton", 6, 0.75)]),
        w(36, [g("ghoul", 10, 0.48), g("skeleton", 6, 0.8, 1)]),
        w(40, [g("abom", 2, 2.2), g("ghoul", 8, 0.6)]),
        w(42, [g("skeleton", 10, 0.55)]),
        w(46, [g("abom", 2, 2), g("skeleton", 8, 0.65)]),
        w(80, [g("skeleton", 6, 0.7), g("ghoul", 8, 0.55), g("malganis", 1, 1, 5)])
      ];
    } else if (i === 3) {
      waves = [
        w(32, [g("ghoul", 8, 0.7), g("skeleton", 4, 0.9)]),
        w(36, [g("gargoyle", 5, 1.15)]),
        w(38, [g("skeleton", 6, 0.75), g("gargoyle", 4, 1, 1)]),
        w(42, [g("abom", 1, 1), g("gargoyle", 5, 0.9, 1.2)]),
        w(44, [g("gargoyle", 8, 0.62)]),
        w(48, [g("skeleton", 8, 0.65), g("gargoyle", 4, 0.9), g("abom", 1, 1, 2)]),
        w(50, [g("ghoul", 8, 0.5), g("gargoyle", 6, 0.75)]),
        w(60, [g("abom", 2, 2), g("gargoyle", 6, 0.7), g("skeleton", 6, 0.6, 1)])
      ];
    } else if (i === 4) {
      waves = [
        w(34, [g("wolf", 6, 0.7)]),
        w(38, [g("wolf", 5, 0.6), g("skeleton", 5, 0.8, 1)]),
        w(40, [g("wolf", 8, 0.42)]),
        w(44, [g("abom", 1, 1), g("wolf", 6, 0.55)]),
        w(46, [g("skeleton", 6, 0.65), g("wolf", 8, 0.48)]),
        w(48, [g("wolf", 10, 0.38)]),
        w(84, [g("abom", 1, 1), g("wolf", 6, 0.5), g("butcher", 1, 1, 4)])
      ];
    } else if (i === 5) {
      waves = [
        w(36, [g("skeleton", 6, 0.75), g("necro", 2, 1.4, 1)]),
        w(40, [g("banshee", 5, 1)]),
        w(42, [g("naga", 4, 0.9), g("skeleton", 4, 0.7)]),
        w(44, [g("necro", 3, 1.2), g("ghoul", 6, 0.55, 1)]),
        w(48, [g("banshee", 4, 0.85), g("naga", 4, 0.9)]),
        w(50, [g("abom", 2, 2), g("banshee", 4, 0.8, 1)]),
        w(52, [g("necro", 4, 1), g("banshee", 5, 0.75)]),
        w(64, [g("naga", 5, 0.8), g("abom", 2, 2), g("banshee", 4, 0.7), g("necro", 2, 1.2, 1)])
      ];
    } else if (i === 6) {
      waves = [
        w(40, [g("skeleton", 8, 0.65), g("ghoul", 6, 0.55)]),
        w(44, [g("gargoyle", 6, 0.8), g("banshee", 3, 1, 1)]),
        w(46, [g("abom", 2, 1.8), g("necro", 2, 1.2)]),
        w(50, [g("banshee", 6, 0.7), g("gargoyle", 5, 0.75)]),
        w(52, [g("abom", 2, 1.8), g("skeleton", 8, 0.55), g("gargoyle", 4, 0.8)]),
        w(56, [g("necro", 3, 1), g("banshee", 4, 0.7), g("abom", 1, 1, 2)]),
        w(90, [g("ghoul", 8, 0.5), g("gargoyle", 4, 0.8), g("kel", 1, 1, 5)])
      ];
    } else if (i === 7) {
      waves = [
        w(42, [g("skeleton", 6, 0.7), g("wolf", 4, 0.55)]),
        w(46, [g("gargoyle", 6, 0.75), g("ghoul", 6, 0.5)]),
        w(48, [g("frost", 2, 2.1)]),
        w(52, [g("frost", 2, 1.8), g("gargoyle", 5, 0.7, 1)]),
        w(54, [g("abom", 2, 1.8), g("frost", 2, 2)]),
        w(56, [g("gargoyle", 8, 0.55), g("banshee", 3, 0.9, 1)]),
        w(60, [g("frost", 3, 1.6), g("abom", 2, 1.8), g("gargoyle", 4, 0.7)]),
        w(70, [g("frost", 3, 1.5), g("gargoyle", 6, 0.6), g("abom", 2, 1.6), g("skeleton", 8, 0.5, 1)])
      ];
    } else if (i === 8) {
      waves = [
        w(44, [g("ghoul", 8, 0.55), g("skeleton", 6, 0.65)]),
        w(48, [g("gargoyle", 6, 0.7), g("banshee", 4, 0.85)]),
        w(52, [g("frost", 2, 1.7), g("abom", 2, 1.6)]),
        w(54, [g("wolf", 8, 0.4), g("gargoyle", 5, 0.65)]),
        w(58, [g("naga", 4, 0.8), g("frost", 2, 1.6), g("banshee", 3, 0.8)]),
        w(80, [g("wyrm", 1, 1, 1.2), g("gargoyle", 6, 0.6), g("skeleton", 6, 0.55)]),
        w(64, [g("abom", 3, 1.5), g("frost", 2, 1.6), g("gargoyle", 5, 0.6)]),
        w(72, [g("frost", 3, 1.4), g("banshee", 5, 0.65), g("gargoyle", 6, 0.55), g("abom", 2, 1.5)])
      ];
    } else {
      waves = [
        w(48, [g("skeleton", 8, 0.6), g("ghoul", 8, 0.5)]),
        w(54, [g("gargoyle", 6, 0.65), g("banshee", 4, 0.75), g("abom", 1, 1, 1)]),
        w(60, [g("frost", 2, 1.5), g("necro", 3, 1), g("gargoyle", 4, 0.7)]),
        w(70, [g("wyrm", 1, 1, 1), g("frost", 2, 1.6), g("gargoyle", 6, 0.55)]),
        w(120, [g("ghoul", 10, 0.45), g("skeleton", 6, 0.55), g("lich", 1, 1, 6)])
      ];
    }
    lv.waves = waves;
  });

  var SKILLS = {
    drow: { file: "ColdArrows", ranks: 3, name: "Морозные стрелы" },
    jugg: { file: "Whirlwind", ranks: 3, name: "Клинок-вихрь" },
    cm: { file: "Blizzard", ranks: 3, name: "Хрустальная нова" },
    zeus: { file: "ChainLightning", ranks: 3, name: "Цепная молния" },
    axe: { file: "BattleRoar", ranks: 3, name: "Боевой клич" },
    sniper: { file: "TheBlackArrow", ranks: 3, name: "Дальний выстрел" },
    wr: { file: "TrueShot", ranks: 3, name: "Силовой выстрел" },
    frostlich: { file: "FrostBolt", ranks: 3, name: "Ледяная цепь" },
    ursa: { file: "Bash", ranks: 3, name: "Ярость когтей" },
    pudge: { file: "Impale", ranks: 3, name: "Мясной крюк" },
    qop: { file: "HowlOfTerror", ranks: 3, name: "Крик боли" },
    necrofos: { file: "CarrionSwarm", ranks: 3, name: "Пульс смерти" },
    visage: { file: "StoneForm", ranks: 1, name: "Каменные гаргульи" },
    techies: { file: "UnstableConcoction", ranks: 1, name: "Мина" },
    tide: { file: "SeaGiantWarStomp", ranks: 3, name: "Реведж" }
  };

  return {
    DIFF: DIFF,
    MATRIX: MATRIX,
    ORDER: ORDER,
    TOWERS: TOWERS,
    SKILLS: SKILLS,
    ITEMS: ITEMS,
    ITEM_ORDER: ITEM_ORDER,
    ENEMIES: ENEMIES,
    TIPS: TIPS,
    LEVELS: LEVELS
  };
})();
