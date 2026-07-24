(() => {
  const ROUND_SECONDS = 10 * 60;
  const MOVE_SPEED = 11; // map percent per second
  const GOBLIN_SPEED = 8; // map percent per second
  const WALK_FRAME_MS = 140;
  const GATHER_INTERVAL_SECONDS = 10;
  const CASTLE_MAX_HP = 100;
  const CASTLE_POSITION = { left: 50, top: 48 };
  // Outer stone ring on the map — goblins cannot pass inside this radius.
  const CASTLE_WALL_RADIUS_PERCENT = 11;
  const MELEE_RANGE_INCHES = 0.45;
  const ARCHER_RANGE_INCHES = 2;
  const FOOTMAN_AGGRO_INCHES = 2;
  const TOWER_RANGE_INCHES = 3;
  const UNIT_BODY_INCHES = 0.28;
  const CSS_PX_PER_INCH = 96;
  const COMBAT_INTERVAL_SECONDS = 2;
  const BATTERING_RAM_ATTACK_SECONDS = 5;
  const BATTERING_RAM_CASTLE_DAMAGE = 10;

  const GOBLIN_LEVELS = {
    1: {
      level: 1,
      label: "Goblin",
      sprite: "assets/units/goblin-1.png",
      maxHp: 5,
      hitOn: 2,
      damage: 1,
      rangeInches: MELEE_RANGE_INCHES,
      speedScale: 1,
      siegesCastle: false,
    },
    2: {
      level: 2,
      label: "Goblin",
      sprite: "assets/units/goblin-2.png",
      maxHp: 15,
      hitOn: 4,
      damage: 2,
      rangeInches: MELEE_RANGE_INCHES,
      speedScale: 1,
      siegesCastle: false,
    },
    3: {
      level: 3,
      label: "Goblin Archer",
      sprite: "assets/units/goblin-3.png",
      maxHp: 5,
      hitOn: 2,
      damage: 1,
      rangeInches: ARCHER_RANGE_INCHES,
      speedScale: 1,
      siegesCastle: false,
    },
    4: {
      level: 4,
      label: "Battering Ram",
      sprite: "assets/units/goblin-ram.png",
      maxHp: 20,
      hitOn: 7,
      damage: 0,
      rangeInches: MELEE_RANGE_INCHES,
      speedScale: 0.5,
      siegesCastle: true,
      castleDamage: BATTERING_RAM_CASTLE_DAMAGE,
      castleAttackSeconds: BATTERING_RAM_ATTACK_SECONDS,
    },
  };

  const ROUND_CONFIGS = {
    1: {
      level1: { firstAt: 9 * 60, interval: 60 },
      level2: null,
      level3: null,
      minuteWave: null,
      specialWaves: [],
      finalWaveAt: 30,
      nextRoundHref: "round-2.html",
    },
    2: {
      level1: { firstAt: 9 * 60 + 30, interval: 30 },
      level2: { firstAt: 9 * 60, interval: 60 },
      level3: null,
      minuteWave: null,
      specialWaves: [],
      finalWaveAt: 30,
      nextRoundHref: "round-3.html",
    },
    3: {
      level1: null,
      level2: null,
      level3: null,
      // 9:00 and every minute: 4 level-one + 2 level-two
      minuteWave: {
        firstAt: 9 * 60,
        interval: 60,
        spawns: [
          { level: 1, count: 4 },
          { level: 2, count: 2 },
        ],
      },
      // Extra assault waves at 6:30 and 1:30
      specialWaves: [
        {
          at: 6 * 60 + 30,
          spawns: [
            { level: 1, count: 6 },
            { level: 2, count: 3 },
            { level: 3, count: 3 },
          ],
        },
        {
          at: 1 * 60 + 30,
          spawns: [
            { level: 1, count: 6 },
            { level: 2, count: 3 },
            { level: 3, count: 3 },
          ],
        },
      ],
      finalWaveAt: null,
      nextRoundHref: "round-4.html",
    },
    4: {
      level1: null,
      level2: null,
      level3: null,
      // Same goblin pressure as round three, plus battering rams each minute.
      minuteWave: {
        firstAt: 9 * 60,
        interval: 60,
        spawns: [
          { level: 1, count: 4 },
          { level: 2, count: 2 },
          { level: 4, count: 1 },
        ],
      },
      specialWaves: [
        {
          at: 6 * 60 + 30,
          spawns: [
            { level: 1, count: 6 },
            { level: 2, count: 3 },
            { level: 3, count: 3 },
            { level: 4, count: 2 },
          ],
        },
        {
          at: 1 * 60 + 30,
          spawns: [
            { level: 1, count: 6 },
            { level: 2, count: 3 },
            { level: 3, count: 3 },
            { level: 4, count: 2 },
          ],
        },
      ],
      finalWaveAt: null,
      nextRoundHref: null,
    },
  };

  const ROUND_NUMBER = Number(
    document.querySelector(".game")?.dataset.round || 1
  );
  const ROUND_CONFIG = ROUND_CONFIGS[ROUND_NUMBER] || ROUND_CONFIGS[1];

  const UNIT_STATS = {
    villager: { maxHp: 5 },
    footman: { maxHp: 10 },
    archer: { maxHp: 10 },
    knight: { maxHp: 25 },
    goblin: { maxHp: 5 },
  };

  const TASK_DESTINATIONS = {
    farm: [
      { left: 18, top: 34 },
      { left: 26, top: 38 },
      { left: 72, top: 68 },
      { left: 80, top: 64 },
      { left: 20, top: 58 },
    ],
    mine: [
      { left: 82, top: 14 },
      { left: 88, top: 18 },
      { left: 78, top: 20 },
      { left: 86, top: 22 },
      { left: 90, top: 12 },
    ],
    "chop-wood": [
      { left: 12, top: 42 },
      { left: 36, top: 18 },
      { left: 58, top: 16 },
      { left: 90, top: 48 },
      { left: 64, top: 78 },
      { left: 10, top: 62 },
    ],
    "return-to-castle": [
      { left: 42, top: 58 },
      { left: 58, top: 58 },
      { left: 38, top: 48 },
      { left: 62, top: 48 },
      { left: 50, top: 62 },
    ],
  };

  const GATHER_YIELDS = {
    farm: { resource: "food", amount: 10 },
    mine: { resource: "stone", amount: 1 },
    "chop-wood": { resource: "wood", amount: 2 },
  };

  const RECRUIT_TYPES = {
    footman: {
      label: "Footman",
      food: 30,
      wood: 5,
      stone: 0,
      seconds: 30,
      sprite: "assets/units/footman.png",
    },
    archer: {
      label: "Archer",
      food: 75,
      wood: 25,
      stone: 0,
      seconds: 45,
      sprite: "assets/units/archer.png",
    },
    knight: {
      label: "Knight",
      food: 250,
      wood: 25,
      stone: 0,
      seconds: 120,
      sprite: "assets/units/knight.png",
    },
  };

  const BUILD_TYPES = {
    palisade: {
      label: "Wooden Palisade",
      food: 0,
      wood: 50,
      stone: 0,
      seconds: 30,
      maxHp: 10,
      blockInches: 0.55,
      sprite: "assets/structures/palisade.svg",
      className: "structure--palisade",
    },
    wall: {
      label: "Stone Wall",
      food: 0,
      wood: 0,
      stone: 25,
      seconds: 45,
      maxHp: 20,
      blockInches: 0.6,
      sprite: "assets/structures/wall.svg",
      className: "structure--wall",
    },
    watchtower: {
      label: "Watchtower",
      food: 0,
      wood: 100,
      stone: 50,
      seconds: 60,
      maxHp: 50,
      blockInches: 0.7,
      archerRangeInches: TOWER_RANGE_INCHES,
      sprite: "assets/structures/watchtower.svg",
      className: "structure--watchtower",
    },
  };

  const MILITARY_TYPES = new Set(["footman", "archer", "knight"]);

  const SPAWN_POINTS = [
    { left: 46, top: 64 },
    { left: 50, top: 66 },
    { left: 54, top: 64 },
    { left: 42, top: 66 },
    { left: 58, top: 66 },
    { left: 48, top: 70 },
    { left: 52, top: 70 },
    { left: 44, top: 62 },
    { left: 56, top: 62 },
  ];

  const timerEl = document.getElementById("round-timer");
  const recruitButton = document.getElementById("recruit-button");
  const buildButton = document.getElementById("build-button");
  const resourcesButton = document.getElementById("resources-button");
  const recruitMenu = document.getElementById("recruit-menu");
  const buildMenu = document.getElementById("build-menu");
  const resourcesMenu = document.getElementById("resources-menu");
  const villagerMenu = document.getElementById("villager-menu");
  const backdrop = document.getElementById("popup-backdrop");
  const resourceFoodEl = document.getElementById("resource-food");
  const resourceWoodEl = document.getElementById("resource-wood");
  const resourceStoneEl = document.getElementById("resource-stone");
  const unitsLayer = document.getElementById("units-layer");
  const structuresLayer = document.getElementById("structures-layer");
  const recruitingQueueEl = document.getElementById("recruiting-queue");
  const buildGhost = document.getElementById("build-ghost");
  const castleHealthEl = document.getElementById("castle-health");
  const castleHealthFillEl = document.getElementById("castle-health-fill");
  const castleHealthValueEl = document.getElementById("castle-health-value");
  const victoryOverlay = document.getElementById("victory-overlay");
  const nextRoundButton = document.getElementById("next-round-button");
  const defeatOverlay = document.getElementById("defeat-overlay");
  const retryRoundButton = document.getElementById("retry-round-button");
  const roundIntro = document.getElementById("round-intro");
  const roundIntroContinue = document.getElementById("round-intro-continue");

  const resources = {
    food: 100,
    wood: 50,
    stone: 25,
  };

  let remainingSeconds = ROUND_SECONDS;
  let gatherCountdown = GATHER_INTERVAL_SECONDS;
  let combatCountdown = COMBAT_INTERVAL_SECONDS;
  let castleHp = CASTLE_MAX_HP;
  let gameOver = false;
  let introActive = Boolean(roundIntro && !roundIntro.hidden);
  let openMenu = null;
  let selectedUnit = null;
  let placementType = null;
  let nextUnitId = 1;
  let nextRecruitId = 1;
  let nextBuildId = 1;
  let nextGoblinId = 1;
  let nextStructureId = 1;
  let lastFrameTime = performance.now();

  const units = Array.from(document.querySelectorAll(".unit"));
  const villagers = units.filter((unit) => unit.dataset.unit === "villager");
  const goblins = [];
  const structures = [];
  const allMenus = [recruitMenu, buildMenu, resourcesMenu, villagerMenu].filter(
    Boolean
  );
  const hudMenuButtons = [recruitButton, buildButton, resourcesButton].filter(
    Boolean
  );
  const activeMoves = new Map();
  const recruitJobs = [];
  const buildJobs = [];

  function canAfford(cost) {
    return (
      resources.food >= cost.food &&
      resources.wood >= cost.wood &&
      resources.stone >= (cost.stone || 0)
    );
  }

  function updateRecruitAffordability() {
    recruitMenu?.querySelectorAll("[data-recruit]").forEach((button) => {
      const type = button.getAttribute("data-recruit");
      const config = RECRUIT_TYPES[type];
      if (!config) return;
      button.disabled = !canAfford(config);
    });
  }

  function updateBuildAffordability() {
    buildMenu?.querySelectorAll("[data-build]").forEach((button) => {
      const type = button.getAttribute("data-build");
      const config = BUILD_TYPES[type];
      if (!config) return;
      button.disabled = !canAfford(config);
    });
  }

  function renderResources() {
    if (resourceFoodEl) resourceFoodEl.textContent = String(resources.food);
    if (resourceWoodEl) resourceWoodEl.textContent = String(resources.wood);
    if (resourceStoneEl) resourceStoneEl.textContent = String(resources.stone);
    updateRecruitAffordability();
    updateBuildAffordability();
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateTimer() {
    if (!timerEl) return;
    timerEl.textContent = formatTime(remainingSeconds);
    timerEl.setAttribute(
      "datetime",
      `PT${Math.floor(remainingSeconds / 60)}M${remainingSeconds % 60}S`
    );
  }

  function renderCastleHealth() {
    const clamped = Math.max(0, Math.min(CASTLE_MAX_HP, castleHp));
    castleHp = clamped;
    if (castleHealthValueEl) {
      castleHealthValueEl.textContent = String(clamped);
    }
    if (castleHealthFillEl) {
      castleHealthFillEl.style.width = `${(clamped / CASTLE_MAX_HP) * 100}%`;
    }
    if (castleHealthEl) {
      castleHealthEl.setAttribute("aria-valuenow", String(clamped));
    }
  }

  function castleWallsStanding() {
    return castleHp > 0;
  }

  function getCastleWallRadius(paddingPercent = 0) {
    return CASTLE_WALL_RADIUS_PERCENT + paddingPercent;
  }

  function getCastleBlockerAtPoint(left, top, paddingPercent = 0) {
    if (!castleWallsStanding()) return null;
    const pos = CASTLE_POSITION;
    const radius = getCastleWallRadius(paddingPercent);
    const dist = distanceBetween({ left, top }, pos);
    if (dist < radius) {
      return { kind: "castle", dist, pos, radius };
    }
    return null;
  }

  function findMovementBlocker(left, top, paddingPercent = 0) {
    const structureHit = findStructureAtPoint(left, top, paddingPercent);
    const castleHit = getCastleBlockerAtPoint(left, top, paddingPercent);

    if (structureHit && castleHit) {
      return structureHit.dist <= castleHit.dist
        ? { kind: "structure", ...structureHit }
        : castleHit;
    }
    if (structureHit) return { kind: "structure", ...structureHit };
    return castleHit;
  }

  function goblinInCastleMelee(goblin) {
    if (!goblin?.isConnected || !castleWallsStanding()) return false;
    const dist = distanceBetween(getUnitPosition(goblin), CASTLE_POSITION);
    const reach =
      CASTLE_WALL_RADIUS_PERCENT + getRangePercent(MELEE_RANGE_INCHES);
    return dist <= reach;
  }

  function applyCastleDamage(amount) {
    if (!castleWallsStanding() || amount <= 0) return;
    castleHp = Math.max(0, castleHp - amount);
    renderCastleHealth();
    if (castleHp <= 0) {
      showDefeat();
    }
  }

  function resolveGoblinCastleAttack(goblin) {
    if (!goblinInCastleMelee(goblin) || isBatteringRam(goblin)) return false;
    const damage = rollAttackDamage(goblin);
    if (damage <= 0) return false;
    playAttackShake(goblin);
    applyCastleDamage(damage);
    return true;
  }

  function resolveBatteringRamSiege(ram) {
    if (!ram?.isConnected || !isBatteringRam(ram)) return false;

    const config = getGoblinLevelConfig(4);
    const structureHit = findNearbyStructure(ram);
    const atCastle = goblinInCastleMelee(ram);
    if (!atCastle && structureHit?.kind !== "structure") {
      ram.dataset.ramCooldown = "0";
      return false;
    }

    const cooldown = Number(ram.dataset.ramCooldown || 0) + 1;
    const interval = config.castleAttackSeconds || BATTERING_RAM_ATTACK_SECONDS;
    if (cooldown < interval) {
      ram.dataset.ramCooldown = String(cooldown);
      return false;
    }

    ram.dataset.ramCooldown = "0";
    playAttackShake(ram);
    const damage = config.castleDamage || BATTERING_RAM_CASTLE_DAMAGE;

    if (structureHit?.kind === "structure" && structureHit.structure) {
      applyDamage(structureHit.structure, damage);
      return true;
    }

    if (atCastle) {
      applyCastleDamage(damage);
      return true;
    }

    return false;
  }

  function tickBatteringRams() {
    goblins.forEach((goblin) => {
      if (goblin.isConnected && isBatteringRam(goblin)) {
        resolveBatteringRamSiege(goblin);
      }
    });
  }

  function endRoundInteraction() {
    cancelPlacement();
    closeMenus();
    clearSelection();
  }

  function showVictory() {
    if (gameOver) return;
    gameOver = true;
    endRoundInteraction();
    if (defeatOverlay) defeatOverlay.hidden = true;
    if (nextRoundButton) {
      if (ROUND_CONFIG.nextRoundHref) {
        nextRoundButton.href = ROUND_CONFIG.nextRoundHref;
        nextRoundButton.hidden = false;
      } else {
        nextRoundButton.hidden = true;
      }
    }
    if (victoryOverlay) {
      victoryOverlay.hidden = false;
      document.querySelector(".game")?.classList.add("is-victory");
      if (nextRoundButton && !nextRoundButton.hidden) {
        nextRoundButton.focus();
      }
    }
  }

  function showDefeat() {
    if (gameOver) return;
    gameOver = true;
    endRoundInteraction();
    if (victoryOverlay) victoryOverlay.hidden = true;
    if (retryRoundButton) {
      const currentPage =
        window.location.pathname.split("/").pop() ||
        `round-${ROUND_NUMBER}.html`;
      retryRoundButton.href = currentPage;
    }
    if (defeatOverlay) {
      defeatOverlay.hidden = false;
      document.querySelector(".game")?.classList.add("is-defeat");
      retryRoundButton?.focus();
    }
  }

  function checkRoundEnd() {
    if (gameOver) return;
    if (castleHp <= 0) {
      showDefeat();
      return;
    }
    if (remainingSeconds > 0) return;
    showVictory();
  }

  function collectResources() {
    let gained = false;

    villagers.forEach((unit) => {
      if (unit.dataset.working !== "true") return;
      const yieldInfo = GATHER_YIELDS[unit.dataset.task];
      if (!yieldInfo) return;
      resources[yieldInfo.resource] += yieldInfo.amount;
      gained = true;
    });

    if (gained) renderResources();
  }

  function formatRecruitClock(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function createQueueCard(job, title) {
    const card = document.createElement("div");
    card.className = "recruiting-card";
    if (job.kind === "build") {
      card.dataset.buildId = String(job.id);
    } else {
      card.dataset.recruitId = String(job.id);
    }
    card.innerHTML = `
      <div class="recruiting-card__clock" aria-hidden="true"></div>
      <div class="recruiting-card__copy">
        <div class="recruiting-card__title">${title}</div>
        <div class="recruiting-card__unit">${job.label}</div>
        <div class="recruiting-card__time">${formatRecruitClock(job.remaining)}</div>
      </div>
    `;
    return card;
  }

  function createRecruitCard(job) {
    return createQueueCard(job, "Recruiting");
  }

  function createBuildCard(job) {
    return createQueueCard(job, "Building");
  }

  function updateRecruitCard(job) {
    const timeEl = job.card.querySelector(".recruiting-card__time");
    if (timeEl) timeEl.textContent = formatRecruitClock(job.remaining);
  }

  function updateBuildCard(job) {
    updateRecruitCard(job);
  }

  function pickSpawnPoint() {
    const occupied = new Set(
      units.map((unit) => {
        const pos = getUnitPosition(unit);
        return `${Math.round(pos.left)}:${Math.round(pos.top)}`;
      })
    );

    const free = SPAWN_POINTS.find(
      (point) => !occupied.has(`${point.left}:${point.top}`)
    );
    if (free) return { ...free };

    const index = units.length % SPAWN_POINTS.length;
    const base = SPAWN_POINTS[index];
    return {
      left: base.left + (units.length % 3) * 2,
      top: base.top + Math.floor(units.length / 3),
    };
  }

  function getGoblinLevelConfig(level) {
    return GOBLIN_LEVELS[level] || GOBLIN_LEVELS[1];
  }

  function isBatteringRam(unit) {
    return (
      unit?.dataset.unit === "goblin" &&
      Number(unit.dataset.goblinLevel || 1) === 4
    );
  }

  function getUnitStats(unit) {
    if (!unit) return UNIT_STATS.villager;
    if (unit.dataset.unit === "goblin") {
      const level = Number(unit.dataset.goblinLevel || 1);
      return { maxHp: getGoblinLevelConfig(level).maxHp };
    }
    return UNIT_STATS[unit.dataset.unit] || UNIT_STATS.villager;
  }

  function getRangePercent(inches) {
    const gameEl = document.querySelector(".game");
    const width = gameEl?.getBoundingClientRect().width || 1200;
    return ((inches * CSS_PX_PER_INCH) / width) * 100;
  }

  function getMeleeRangePercent() {
    return getRangePercent(MELEE_RANGE_INCHES);
  }

  function getAttackRangePercent(unit) {
    if (unit?.dataset.unit === "archer") {
      return getRangePercent(ARCHER_RANGE_INCHES);
    }
    if (unit?.dataset.unit === "goblin") {
      const level = Number(unit.dataset.goblinLevel || 1);
      const config = getGoblinLevelConfig(level);
      return getRangePercent(config.rangeInches || MELEE_RANGE_INCHES);
    }
    return getMeleeRangePercent();
  }

  function getFootmanAggroRangePercent() {
    return getRangePercent(FOOTMAN_AGGRO_INCHES);
  }

  function rollD6() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function rollAttackDamage(unit) {
    if (!unit) return 0;
    const type = unit.dataset.unit;

    if (type === "knight") {
      return 2;
    }

    const roll = rollD6();

    if (type === "villager") {
      return roll >= 5 ? 1 : 0;
    }

    if (type === "goblin") {
      const level = Number(unit.dataset.goblinLevel || 1);
      const config = getGoblinLevelConfig(level);
      return roll >= config.hitOn ? config.damage : 0;
    }

    if (type === "footman" || type === "archer") {
      return roll >= 3 ? 1 : 0;
    }

    return 0;
  }

  function playAttackShake(unit) {
    if (!unit) return;
    unit.classList.remove("is-attacking");
    void unit.offsetWidth;
    unit.classList.add("is-attacking");
    window.setTimeout(() => {
      unit.classList.remove("is-attacking");
    }, 380);
  }

  function ensureHealthBar(entity) {
    if (entity.querySelector(".unit-hp")) return;
    const bar = document.createElement("div");
    bar.className = "unit-hp";
    bar.hidden = true;
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<div class="unit-hp__fill"></div>';
    entity.appendChild(bar);
  }

  function updateHealthBar(entity) {
    const bar = entity.querySelector(".unit-hp");
    const fill = entity.querySelector(".unit-hp__fill");
    if (!bar || !fill) return;

    const hp = Number(entity.dataset.hp || 0);
    const maxHp = Number(entity.dataset.maxHp || 1);
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    const percent = Math.max(0, Math.min(100, ratio * 100));

    fill.style.height = `${percent}%`;
    bar.classList.remove("unit-hp--green", "unit-hp--yellow", "unit-hp--red");
    if (ratio >= 0.7) bar.classList.add("unit-hp--green");
    else if (ratio >= 0.2) bar.classList.add("unit-hp--yellow");
    else bar.classList.add("unit-hp--red");

    const engaged = entity.dataset.engaged === "true";
    bar.hidden = !engaged;
  }

  function setUnitEngaged(entity, engaged) {
    if (!entity) return;
    entity.dataset.engaged = engaged ? "true" : "false";
    entity.classList.toggle("is-engaged", engaged);
    updateHealthBar(entity);
  }

  function getStructurePosition(structure) {
    return {
      left: parseFloat(structure.style.left) || 0,
      top: parseFloat(structure.style.top) || 0,
    };
  }

  function getBuildConfig(structure) {
    return BUILD_TYPES[structure?.dataset.structure] || null;
  }

  function getStructureBlockRadius(structure) {
    const config = getBuildConfig(structure);
    return getRangePercent(config?.blockInches || 0.55);
  }

  function isStructureComplete(structure) {
    return structure?.dataset.building !== "true";
  }

  function findStructureAtPoint(left, top, paddingPercent = 0) {
    let best = null;

    structures.forEach((structure) => {
      if (!structure.isConnected) return;
      const pos = getStructurePosition(structure);
      const radius = getStructureBlockRadius(structure) + paddingPercent;
      const dist = distanceBetween({ left, top }, pos);
      if (dist < radius && (!best || dist < best.dist)) {
        best = { structure, dist, pos, radius };
      }
    });

    return best;
  }

  function canPlaceStructure(type, point) {
    const config = BUILD_TYPES[type];
    if (!config || !point) return false;
    const placeRadius = getRangePercent(config.blockInches);
    const overlap = findStructureAtPoint(
      point.left,
      point.top,
      placeRadius * 0.85
    );
    if (overlap) return false;
    if (getCastleBlockerAtPoint(point.left, point.top, placeRadius * 0.5)) {
      return false;
    }
    return true;
  }

  function initUnitCombat(unit) {
    if (!unit) return;
    const stats = getUnitStats(unit);
    unit.dataset.maxHp = String(stats.maxHp);
    unit.dataset.hp = String(stats.maxHp);
    unit.dataset.engaged = "false";
    ensureHealthBar(unit);
    updateHealthBar(unit);
  }

  function removeUnit(unit) {
    if (!unit) return;

    if (selectedUnit === unit) {
      clearSelection();
    }

    stopUnit(unit);
    activeMoves.delete(unit);

    const unitIndex = units.indexOf(unit);
    if (unitIndex >= 0) units.splice(unitIndex, 1);

    const villagerIndex = villagers.indexOf(unit);
    if (villagerIndex >= 0) villagers.splice(villagerIndex, 1);

    const goblinIndex = goblins.indexOf(unit);
    if (goblinIndex >= 0) goblins.splice(goblinIndex, 1);

    unit.remove();
  }

  function applyDamage(entity, amount) {
    if (!entity || !entity.isConnected || amount <= 0) return;
    const isStructure = entity.classList.contains("structure");
    const maxHp = Number(
      entity.dataset.maxHp ||
        (isStructure
          ? getBuildConfig(entity)?.maxHp || 1
          : getUnitStats(entity).maxHp)
    );
    const current = Number(entity.dataset.hp || maxHp);
    const next = Math.max(0, current - amount);
    entity.dataset.hp = String(next);
    updateHealthBar(entity);
    if (next <= 0) {
      if (isStructure) removeStructure(entity);
      else removeUnit(entity);
    }
  }

  function cancelBuildJobForStructure(structure) {
    const job = buildJobs.find((item) => item.structure === structure);
    if (!job) return;
    job.card?.remove();
    const index = buildJobs.indexOf(job);
    if (index >= 0) buildJobs.splice(index, 1);
  }

  function removeStructure(structure) {
    if (!structure) return;
    cancelBuildJobForStructure(structure);
    const index = structures.indexOf(structure);
    if (index >= 0) structures.splice(index, 1);
    structure.remove();
  }

  function getFriendlyCombatUnits() {
    return units.filter(
      (unit) =>
        unit.isConnected &&
        (unit.dataset.unit === "villager" || isMilitaryUnit(unit))
    );
  }

  function getMilitaryUnits() {
    return units.filter((unit) => unit.isConnected && isMilitaryUnit(unit));
  }

  function getFootmen() {
    return units.filter(
      (unit) => unit.isConnected && unit.dataset.unit === "footman"
    );
  }

  function isGoblinEngagedWithMilitary(goblin) {
    if (!goblin?.isConnected) return false;
    return getMilitaryUnits().some((unit) => unitsAreInCombat(goblin, unit));
  }

  function findNearestMilitaryForGoblin(goblin) {
    const from = getUnitPosition(goblin);
    let best = null;

    getMilitaryUnits().forEach((unit) => {
      const pos = getUnitPosition(unit);
      const dist = distanceBetween(from, pos);
      if (!best || dist < best.dist) {
        best = { unit, pos, dist };
      }
    });

    return best;
  }

  function getEntityPosition(entity) {
    if (!entity) return { left: 0, top: 0 };
    if (entity.classList.contains("structure")) {
      return getStructurePosition(entity);
    }
    return getUnitPosition(entity);
  }

  function unitsAreInCombat(a, b) {
    if (!a?.isConnected || !b?.isConnected) return false;
    const dist = distanceBetween(getEntityPosition(a), getEntityPosition(b));
    return (
      dist <= getAttackRangePercent(a) || dist <= getAttackRangePercent(b)
    );
  }

  function goblinInStructureMelee(goblin, structure) {
    if (!goblin?.isConnected || !structure?.isConnected) return false;
    const dist = distanceBetween(
      getUnitPosition(goblin),
      getStructurePosition(structure)
    );
    const reach =
      getStructureBlockRadius(structure) + getRangePercent(MELEE_RANGE_INCHES);
    return dist <= reach;
  }

  function canDeliverAttack(attacker, defender) {
    if (!attacker?.isConnected || !defender?.isConnected) return false;

    if (attacker.classList.contains("structure")) {
      const config = getBuildConfig(attacker);
      if (
        attacker.dataset.structure !== "watchtower" ||
        !isStructureComplete(attacker) ||
        !config
      ) {
        return false;
      }
      const dist = distanceBetween(
        getStructurePosition(attacker),
        getUnitPosition(defender)
      );
      return dist <= getRangePercent(config.archerRangeInches || TOWER_RANGE_INCHES);
    }

    if (defender.classList.contains("structure")) {
      return goblinInStructureMelee(attacker, defender);
    }

    const dist = distanceBetween(
      getUnitPosition(attacker),
      getUnitPosition(defender)
    );
    return dist <= getAttackRangePercent(attacker);
  }

  function resolveUnitAttack(attacker, defender) {
    if (!canDeliverAttack(attacker, defender)) return false;
    const damage = rollAttackDamage(attacker);
    if (damage <= 0) return false;
    playAttackShake(attacker);
    applyDamage(defender, damage);
    return true;
  }

  function resolveTowerAttack(tower, goblin) {
    if (!canDeliverAttack(tower, goblin)) return false;
    const roll = rollD6();
    const damage = roll >= 3 ? 1 : 0;
    if (damage <= 0) return false;
    playAttackShake(tower);
    applyDamage(goblin, damage);
    return true;
  }

  function refreshEngagements() {
    const friends = getFriendlyCombatUnits();
    const foes = goblins.filter((goblin) => goblin.isConnected);
    const liveStructures = structures.filter((structure) => structure.isConnected);

    units.forEach((unit) => {
      if (unit.isConnected) setUnitEngaged(unit, false);
    });
    liveStructures.forEach((structure) => setUnitEngaged(structure, false));

    foes.forEach((goblin) => {
      friends.forEach((friend) => {
        if (unitsAreInCombat(goblin, friend)) {
          setUnitEngaged(goblin, true);
          setUnitEngaged(friend, true);
        }
      });

      liveStructures.forEach((structure) => {
        if (goblinInStructureMelee(goblin, structure)) {
          setUnitEngaged(goblin, true);
          setUnitEngaged(structure, true);
        }
      });
    });
  }

  function findNearestAttackTarget(attacker, candidates, getPos = getEntityPosition) {
    const from = getEntityPosition(attacker);
    let best = null;

    candidates.forEach((target) => {
      if (!target.isConnected) return;
      if (!canDeliverAttack(attacker, target)) return;
      const dist = distanceBetween(from, getPos(target));
      if (!best || dist < best.dist) {
        best = { target, dist };
      }
    });

    return best;
  }

  function resolveCombatRounds() {
    const friends = getFriendlyCombatUnits();
    const military = getMilitaryUnits();
    const villagerTargets = friends.filter(
      (unit) => unit.dataset.unit === "villager"
    );
    const foes = goblins.filter((goblin) => goblin.isConnected);
    const liveStructures = structures.filter((structure) => structure.isConnected);

    foes.forEach((goblin) => {
      if (!goblin.isConnected) return;

      // Battering rams ignore villagers and military; they only siege.
      if (isBatteringRam(goblin)) return;

      const nearestMilitary = findNearestAttackTarget(
        goblin,
        military,
        getUnitPosition
      );
      if (nearestMilitary) {
        resolveUnitAttack(goblin, nearestMilitary.target);
        return;
      }

      // Engaged with a Footman/Archer/Knight (including archer range):
      // cannot peel off to attack villagers.
      if (isGoblinEngagedWithMilitary(goblin)) {
        return;
      }

      const nearestVillager = findNearestAttackTarget(
        goblin,
        villagerTargets,
        getUnitPosition
      );
      if (nearestVillager) {
        resolveUnitAttack(goblin, nearestVillager.target);
        return;
      }

      const nearestStructure = findNearestAttackTarget(
        goblin,
        liveStructures,
        getStructurePosition
      );
      if (nearestStructure) {
        resolveUnitAttack(goblin, nearestStructure.target);
        return;
      }

      if (goblinInCastleMelee(goblin)) {
        resolveGoblinCastleAttack(goblin);
      }
    });

    friends.forEach((friend) => {
      if (!friend.isConnected) return;
      const nearest = findNearestAttackTarget(friend, foes, getUnitPosition);
      if (nearest) resolveUnitAttack(friend, nearest.target);
    });

    liveStructures.forEach((structure) => {
      if (
        structure.dataset.structure !== "watchtower" ||
        !isStructureComplete(structure)
      ) {
        return;
      }
      const nearest = foes
        .filter((goblin) => goblin.isConnected && canDeliverAttack(structure, goblin))
        .map((goblin) => ({
          goblin,
          dist: distanceBetween(
            getStructurePosition(structure),
            getUnitPosition(goblin)
          ),
        }))
        .sort((a, b) => a.dist - b.dist)[0];
      if (nearest) resolveTowerAttack(structure, nearest.goblin);
    });
  }

  function updateCombat() {
    refreshEngagements();
  }

  function spawnMilitaryUnit(type) {
    const config = RECRUIT_TYPES[type];
    if (!config || !unitsLayer) return null;

    const spawn = pickSpawnPoint();
    const unitId = `military-${nextUnitId++}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `unit unit--military unit--${type}`;
    button.dataset.unit = type;
    button.dataset.unitId = unitId;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", config.label);
    button.style.left = `${spawn.left}%`;
    button.style.top = `${spawn.top}%`;
    button.innerHTML = `
      <span class="unit__sprite unit__sprite--image" aria-hidden="true">
        <img src="${config.sprite}" alt="" draggable="false" />
      </span>
    `;

    unitsLayer.appendChild(button);
    units.push(button);
    bindUnitClick(button);
    initUnitCombat(button);
    return button;
  }

  function completeRecruitJob(job) {
    job.card.remove();
    const index = recruitJobs.indexOf(job);
    if (index >= 0) recruitJobs.splice(index, 1);
    spawnMilitaryUnit(job.type);
  }

  function tickRecruitJobs() {
    if (!recruitJobs.length) return;

    [...recruitJobs].forEach((job) => {
      job.remaining -= 1;
      if (job.remaining <= 0) {
        completeRecruitJob(job);
        return;
      }
      updateRecruitCard(job);
    });
  }

  function startRecruit(type) {
    const config = RECRUIT_TYPES[type];
    if (!config || !canAfford(config) || !recruitingQueueEl) return false;

    resources.food -= config.food;
    resources.wood -= config.wood;
    resources.stone -= config.stone || 0;
    renderResources();

    const job = {
      id: nextRecruitId++,
      kind: "recruit",
      type,
      label: config.label,
      remaining: config.seconds,
      card: null,
    };
    job.card = createRecruitCard(job);
    recruitingQueueEl.appendChild(job.card);
    recruitJobs.push(job);
    return true;
  }

  function initStructureCombat(structure, config) {
    structure.dataset.maxHp = String(config.maxHp);
    structure.dataset.hp = String(config.maxHp);
    structure.dataset.engaged = "false";
    ensureHealthBar(structure);
    updateHealthBar(structure);
  }

  function createStructureElement(type, point, building) {
    const config = BUILD_TYPES[type];
    if (!config || !structuresLayer || !point) return null;

    const structure = document.createElement("div");
    structure.className = `structure ${config.className}`;
    structure.dataset.structure = type;
    structure.dataset.structureId = `structure-${nextStructureId++}`;
    structure.dataset.building = building ? "true" : "false";
    structure.setAttribute("aria-label", config.label);
    structure.style.left = `${point.left}%`;
    structure.style.top = `${point.top}%`;
    structure.innerHTML = `
      <span class="structure__sprite" aria-hidden="true">
        <img src="${config.sprite}" alt="" draggable="false" />
      </span>
    `;
    if (building) structure.classList.add("is-building");

    structuresLayer.appendChild(structure);
    structures.push(structure);
    initStructureCombat(structure, config);
    return structure;
  }

  function completeBuildJob(job) {
    job.card.remove();
    const index = buildJobs.indexOf(job);
    if (index >= 0) buildJobs.splice(index, 1);

    if (!job.structure?.isConnected) return;
    job.structure.dataset.building = "false";
    job.structure.classList.remove("is-building");
  }

  function tickBuildJobs() {
    if (!buildJobs.length) return;

    [...buildJobs].forEach((job) => {
      if (!job.structure?.isConnected) {
        completeBuildJob(job);
        return;
      }
      job.remaining -= 1;
      if (job.remaining <= 0) {
        completeBuildJob(job);
        return;
      }
      updateBuildCard(job);
    });
  }

  function startBuildAt(type, point) {
    const config = BUILD_TYPES[type];
    if (
      !config ||
      !canAfford(config) ||
      !recruitingQueueEl ||
      !canPlaceStructure(type, point)
    ) {
      return false;
    }

    resources.food -= config.food;
    resources.wood -= config.wood;
    resources.stone -= config.stone || 0;
    renderResources();

    const structure = createStructureElement(type, point, true);
    if (!structure) return false;

    const job = {
      id: nextBuildId++,
      kind: "build",
      type,
      label: config.label,
      remaining: config.seconds,
      structure,
      card: null,
    };
    job.card = createBuildCard(job);
    recruitingQueueEl.appendChild(job.card);
    buildJobs.push(job);
    return true;
  }

  function updatePlacementCursor() {
    document
      .querySelector(".game")
      ?.classList.toggle("is-placing-build", Boolean(placementType));
  }

  function setBuildGhostPosition(point) {
    if (!buildGhost || !point) return;
    buildGhost.style.left = `${point.left}%`;
    buildGhost.style.top = `${point.top}%`;
  }

  function updateBuildGhostValidity(point) {
    if (!buildGhost || !placementType || !point) return;
    const valid = canPlaceStructure(placementType, point);
    buildGhost.classList.toggle("is-invalid", !valid);
  }

  function cancelPlacement() {
    placementType = null;
    if (buildGhost) {
      buildGhost.hidden = true;
      buildGhost.innerHTML = "";
      buildGhost.classList.remove("is-invalid");
    }
    updatePlacementCursor();
  }

  function beginPlacement(type) {
    const config = BUILD_TYPES[type];
    if (!config || !canAfford(config) || !buildGhost) return;

    clearSelection();
    closeMenus();
    placementType = type;
    buildGhost.hidden = false;
    buildGhost.className = `build-ghost ${config.className}`;
    buildGhost.innerHTML = `
      <span class="structure__sprite" aria-hidden="true">
        <img src="${config.sprite}" alt="" draggable="false" />
      </span>
    `;
    updatePlacementCursor();
  }

  function tryPlaceBuilding(point) {
    if (!placementType || !point) return false;
    if (!canPlaceStructure(placementType, point)) {
      updateBuildGhostValidity(point);
      return false;
    }
    const type = placementType;
    const placed = startBuildAt(type, point);
    if (placed) cancelPlacement();
    return placed;
  }

  function edgeSpawnForSide(side) {
    if (side === 0) {
      return { left: 4 + Math.random() * 92, top: 4 };
    }
    if (side === 1) {
      return { left: 97, top: 8 + Math.random() * 72 };
    }
    if (side === 2) {
      return { left: 4 + Math.random() * 92, top: 86 };
    }
    return { left: 3, top: 8 + Math.random() * 72 };
  }

  function randomEdgeSpawn() {
    return edgeSpawnForSide(Math.floor(Math.random() * 4));
  }

  function spawnGoblin(level = 1, spawnPoint = null) {
    const config = getGoblinLevelConfig(level);
    if (!unitsLayer || !config) return null;

    const spawn = spawnPoint || randomEdgeSpawn();
    const unitId = `goblin-${nextGoblinId++}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `unit unit--goblin unit--goblin-${level}`;
    button.dataset.unit = "goblin";
    button.dataset.goblinLevel = String(level);
    button.dataset.unitId = unitId;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${config.label} Level ${level}`);
    button.style.left = `${spawn.left}%`;
    button.style.top = `${spawn.top}%`;
    button.innerHTML = `
      <span class="unit__sprite unit__sprite--image" aria-hidden="true">
        <img src="${config.sprite}" alt="" draggable="false" />
      </span>
    `;

    unitsLayer.appendChild(button);
    units.push(button);
    goblins.push(button);
    bindUnitClick(button);
    initUnitCombat(button);
    return button;
  }

  function spawnGoblinsFromAllDirections(level = 1) {
    for (let side = 0; side < 4; side += 1) {
      spawnGoblin(level, edgeSpawnForSide(side));
    }
  }

  function spawnGoblinGroup(level, count) {
    for (let i = 0; i < count; i += 1) {
      // Spread groups around the map edges instead of stacking on one point.
      spawnGoblin(level, edgeSpawnForSide(i % 4));
    }
  }

  function spawnWaveEntries(entries) {
    if (!entries?.length) return;
    entries.forEach((entry) => {
      spawnGoblinGroup(entry.level, entry.count);
    });
  }

  function shouldSpawnOnInterval(secondsLeft, schedule) {
    if (!schedule || secondsLeft <= 0) return false;
    if (secondsLeft > schedule.firstAt) return false;
    return (schedule.firstAt - secondsLeft) % schedule.interval === 0;
  }

  function shouldSpawnLevel1Goblin(secondsLeft) {
    return shouldSpawnOnInterval(secondsLeft, ROUND_CONFIG.level1);
  }

  function shouldSpawnLevel2Goblin(secondsLeft) {
    return shouldSpawnOnInterval(secondsLeft, ROUND_CONFIG.level2);
  }

  function shouldSpawnLevel3Goblin(secondsLeft) {
    return shouldSpawnOnInterval(secondsLeft, ROUND_CONFIG.level3);
  }

  function shouldSpawnMinuteWave(secondsLeft) {
    return shouldSpawnOnInterval(secondsLeft, ROUND_CONFIG.minuteWave);
  }

  function getSpecialWave(secondsLeft) {
    return (
      ROUND_CONFIG.specialWaves?.find((wave) => wave.at === secondsLeft) || null
    );
  }

  function shouldSpawnFinalGoblinWave(secondsLeft) {
    return (
      ROUND_CONFIG.finalWaveAt != null &&
      secondsLeft === ROUND_CONFIG.finalWaveAt
    );
  }

  function spawnRoundGoblins(secondsLeft) {
    if (shouldSpawnFinalGoblinWave(secondsLeft)) {
      spawnGoblinsFromAllDirections(1);
      return;
    }

    const specialWave = getSpecialWave(secondsLeft);
    if (specialWave) {
      spawnWaveEntries(specialWave.spawns);
    }

    if (shouldSpawnMinuteWave(secondsLeft)) {
      spawnWaveEntries(ROUND_CONFIG.minuteWave.spawns);
    }

    if (shouldSpawnLevel1Goblin(secondsLeft)) {
      spawnGoblin(1);
    }
    if (shouldSpawnLevel2Goblin(secondsLeft)) {
      spawnGoblin(2);
    }
    if (shouldSpawnLevel3Goblin(secondsLeft)) {
      spawnGoblin(3);
    }
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.left - b.left, a.top - b.top);
  }

  function getClosestVillager(from) {
    let closest = null;
    let closestDist = Infinity;

    villagers.forEach((villager) => {
      if (!villager.isConnected) return;
      const pos = getUnitPosition(villager);
      const dist = distanceBetween(from, pos);
      if (dist < closestDist) {
        closestDist = dist;
        closest = { unit: villager, pos, dist };
      }
    });

    return closest;
  }

  function getGoblinTarget(goblin) {
    if (isBatteringRam(goblin)) {
      return {
        left: CASTLE_POSITION.left,
        top: CASTLE_POSITION.top,
        kind: "castle",
        unit: null,
      };
    }

    if (isGoblinEngagedWithMilitary(goblin)) {
      const nearestMilitary = findNearestMilitaryForGoblin(goblin);
      if (nearestMilitary) {
        return {
          left: nearestMilitary.pos.left,
          top: nearestMilitary.pos.top,
          kind: nearestMilitary.unit.dataset.unit || "military",
          unit: nearestMilitary.unit,
        };
      }
    }

    const from = getUnitPosition(goblin);
    const closestVillager = getClosestVillager(from);
    const castleDist = distanceBetween(from, CASTLE_POSITION);

    if (closestVillager && closestVillager.dist < castleDist) {
      return {
        left: closestVillager.pos.left,
        top: closestVillager.pos.top,
        kind: "villager",
        unit: closestVillager.unit,
      };
    }

    return {
      left: CASTLE_POSITION.left,
      top: CASTLE_POSITION.top,
      kind: "castle",
      unit: null,
    };
  }

  function findNearbyMilitaryInRange(goblin) {
    const from = getUnitPosition(goblin);
    const attackRange = getAttackRangePercent(goblin);
    let best = null;

    getMilitaryUnits().forEach((unit) => {
      const dist = distanceBetween(from, getUnitPosition(unit));
      if (dist <= attackRange && (!best || dist < best.dist)) {
        best = { friend: unit, dist };
      }
    });

    return best;
  }

  function findNearbyVillagerInRange(goblin) {
    if (isGoblinEngagedWithMilitary(goblin)) return null;

    const from = getUnitPosition(goblin);
    const attackRange = getAttackRangePercent(goblin);
    let best = null;

    villagers.forEach((villager) => {
      if (!villager.isConnected) return;
      const dist = distanceBetween(from, getUnitPosition(villager));
      if (dist <= attackRange && (!best || dist < best.dist)) {
        best = { friend: villager, dist };
      }
    });

    return best;
  }

  function findNearbyStructure(goblin) {
    const from = getUnitPosition(goblin);
    let best = null;

    structures.forEach((structure) => {
      if (!structure.isConnected) return;
      if (!goblinInStructureMelee(goblin, structure)) return;
      const dist = distanceBetween(from, getStructurePosition(structure));
      if (!best || dist < best.dist) {
        best = { kind: "structure", structure, dist, pos: getStructurePosition(structure) };
      }
    });

    if (goblinInCastleMelee(goblin)) {
      const dist = distanceBetween(from, CASTLE_POSITION);
      if (!best || dist < best.dist) {
        best = {
          kind: "castle",
          structure: null,
          dist,
          pos: CASTLE_POSITION,
        };
      }
    }

    return best;
  }

  function updateGoblins(dt) {
    const bodyPad = getRangePercent(UNIT_BODY_INCHES);

    goblins.forEach((goblin) => {
      if (!goblin.isConnected) return;

      const from = getUnitPosition(goblin);
      const ram = isBatteringRam(goblin);
      const speedScale = getGoblinLevelConfig(
        Number(goblin.dataset.goblinLevel || 1)
      ).speedScale;
      const step = (GOBLIN_SPEED * (speedScale || 1) * dt) / 1000;

      if (!ram) {
        const nearbyMilitary = findNearbyMilitaryInRange(goblin);

        if (nearbyMilitary) {
          goblin.dataset.target =
            nearbyMilitary.friend.dataset.unit || "military";
          goblin.classList.remove("is-walking");
          goblin.dataset.frame = "0";
          goblin.classList.toggle(
            "is-flipped",
            getUnitPosition(nearbyMilitary.friend).left < from.left
          );
          return;
        }

        const nearbyVillager = findNearbyVillagerInRange(goblin);
        if (nearbyVillager) {
          goblin.dataset.target = "villager";
          goblin.classList.remove("is-walking");
          goblin.dataset.frame = "0";
          goblin.classList.toggle(
            "is-flipped",
            getUnitPosition(nearbyVillager.friend).left < from.left
          );
          return;
        }
      }

      const nearbyStructure = findNearbyStructure(goblin);
      if (nearbyStructure) {
        goblin.dataset.target = nearbyStructure.kind;
        goblin.classList.remove("is-walking");
        goblin.dataset.frame = "0";
        goblin.classList.toggle(
          "is-flipped",
          nearbyStructure.pos.left < from.left
        );
        return;
      }

      const target = getGoblinTarget(goblin);
      const dx = target.left - from.left;
      const dy = target.top - from.top;
      const dist = Math.hypot(dx, dy);

      goblin.dataset.target = target.kind;

      if (dist < 0.4) {
        goblin.classList.remove("is-walking");
        goblin.dataset.frame = "0";
        return;
      }

      const ratio = Math.min(1, step / dist);
      const nextLeft = from.left + dx * ratio;
      const nextTop = from.top + dy * ratio;
      const blocker = findMovementBlocker(nextLeft, nextTop, bodyPad);

      if (blocker) {
        const stopDist = blocker.radius;
        const distToBlocker = distanceBetween(from, blocker.pos);
        if (distToBlocker > stopDist + 0.2) {
          const approach = distToBlocker - stopDist;
          const moveAmount = Math.min(step, approach);
          const inv = distToBlocker > 0 ? moveAmount / distToBlocker : 0;
          goblin.style.left = `${from.left + (blocker.pos.left - from.left) * inv}%`;
          goblin.style.top = `${from.top + (blocker.pos.top - from.top) * inv}%`;
          goblin.classList.add("is-walking");
        } else {
          goblin.classList.remove("is-walking");
          goblin.dataset.frame = "0";
        }
        goblin.dataset.target = blocker.kind;
        goblin.classList.toggle("is-flipped", blocker.pos.left < from.left);
        return;
      }

      goblin.style.left = `${nextLeft}%`;
      goblin.style.top = `${nextTop}%`;
      goblin.classList.add("is-walking");
      goblin.classList.toggle("is-flipped", dx < 0);
    });
  }

  function dismissRoundIntro() {
    if (!roundIntro) return;
    roundIntro.hidden = true;
    introActive = false;
    document.querySelector(".game")?.classList.remove("is-intro");
  }

  function tick() {
    if (gameOver || introActive) return;

    if (remainingSeconds > 0) {
      remainingSeconds -= 1;
      updateTimer();
      spawnRoundGoblins(remainingSeconds);
    } else {
      updateTimer();
    }

    gatherCountdown -= 1;
    if (gatherCountdown <= 0) {
      gatherCountdown = GATHER_INTERVAL_SECONDS;
      collectResources();
    }

    tickRecruitJobs();
    tickBuildJobs();
    tickBatteringRams();
    refreshEngagements();

    combatCountdown -= 1;
    if (combatCountdown <= 0) {
      combatCountdown = COMBAT_INTERVAL_SECONDS;
      resolveCombatRounds();
      refreshEngagements();
    }

    checkRoundEnd();
  }

  function setExpanded(button, expanded) {
    if (button) button.setAttribute("aria-expanded", String(expanded));
  }

  function closeMenus() {
    allMenus.forEach((menu) => {
      menu.hidden = true;
    });
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    hudMenuButtons.forEach((button) => setExpanded(button, false));
    openMenu = null;
  }

  function showBackdrop() {
    if (!backdrop) return;
    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
  }

  function openMenuPanel(menu, button) {
    if (!menu) return;
    if (placementType) cancelPlacement();
    if (openMenu === menu && button) {
      closeMenus();
      return;
    }
    closeMenus();
    menu.hidden = false;
    showBackdrop();
    if (button) setExpanded(button, true);
    openMenu = menu;
    if (menu === recruitMenu) updateRecruitAffordability();
    if (menu === buildMenu) updateBuildAffordability();
    const closeBtn = menu.querySelector("[data-close-popup]");
    if (closeBtn) closeBtn.focus();
  }

  function isMilitaryUnit(unit) {
    return Boolean(unit && MILITARY_TYPES.has(unit.dataset.unit));
  }

  function bindUnitClick(unit) {
    unit.addEventListener("click", (event) => {
      event.stopPropagation();
      if (unit.dataset.unit === "goblin") {
        return;
      }
      if (unit.dataset.unit === "villager") {
        openVillagerMenu(unit);
        return;
      }
      selectUnit(unit);
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function mapClickToPercent(event) {
    const gameEl = document.querySelector(".game");
    if (!gameEl) return null;
    const rect = gameEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      left: clamp(((event.clientX - rect.left) / rect.width) * 100, 3, 97),
      top: clamp(((event.clientY - rect.top) / rect.height) * 100, 4, 86),
    };
  }

  function issueMilitaryMove(unit, destination) {
    if (!isMilitaryUnit(unit) || !destination) return;
    unit.dataset.task = "move";
    unit.dataset.autoEngage = "false";
    clearWorking(unit);
    moveUnit(unit, destination);
  }

  function findNearestGoblinInAggro(footman) {
    const from = getUnitPosition(footman);
    const aggroRange = getFootmanAggroRangePercent();
    let best = null;

    goblins.forEach((goblin) => {
      if (!goblin.isConnected) return;
      const pos = getUnitPosition(goblin);
      const dist = distanceBetween(from, pos);
      if (dist <= aggroRange && (!best || dist < best.dist)) {
        best = { goblin, pos, dist };
      }
    });

    return best;
  }

  function stepUnitToward(unit, destination, dt) {
    const from = getUnitPosition(unit);
    const dx = destination.left - from.left;
    const dy = destination.top - from.top;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.35) {
      stopUnit(unit);
      return dist;
    }

    activeMoves.delete(unit);
    const step = (MOVE_SPEED * dt) / 1000;
    const ratio = Math.min(1, step / dist);
    unit.style.left = `${from.left + dx * ratio}%`;
    unit.style.top = `${from.top + dy * ratio}%`;
    unit.classList.add("is-walking");
    unit.classList.toggle("is-flipped", dx < 0);
    unit.dataset.frame = String(
      1 + (Math.floor(performance.now() / WALK_FRAME_MS) % 3)
    );
    return dist;
  }

  function updateFootmanAggro(dt) {
    const meleeRange = getMeleeRangePercent();

    getFootmen().forEach((footman) => {
      const target = findNearestGoblinInAggro(footman);
      if (!target) {
        if (footman.dataset.autoEngage === "true") {
          footman.dataset.autoEngage = "false";
          stopUnit(footman);
        }
        return;
      }

      footman.dataset.autoEngage = "true";
      footman.dataset.task = "engage";

      if (target.dist <= meleeRange) {
        stopUnit(footman);
        footman.classList.toggle(
          "is-flipped",
          target.pos.left < getUnitPosition(footman).left
        );
        return;
      }

      stepUnitToward(footman, target.pos, dt);
    });
  }

  function updateMoveCursor() {
    document
      .querySelector(".game")
      ?.classList.toggle("is-issuing-move", isMilitaryUnit(selectedUnit));
  }

  function clearSelection() {
    units.forEach((unit) => {
      unit.classList.remove("is-selected");
      unit.setAttribute("aria-pressed", "false");
    });
    selectedUnit = null;
    updateMoveCursor();
  }

  function selectUnit(unit) {
    if (!unit) return;
    clearSelection();
    unit.classList.add("is-selected");
    unit.setAttribute("aria-pressed", "true");
    selectedUnit = unit;
    updateMoveCursor();
  }

  function openVillagerMenu(unit) {
    selectUnit(unit);
    if (!villagerMenu) return;
    closeMenus();
    villagerMenu.hidden = false;
    showBackdrop();
    openMenu = villagerMenu;
    const firstOption = villagerMenu.querySelector("[data-villager-action]");
    if (firstOption) firstOption.focus();
  }

  function getUnitPosition(unit) {
    return {
      left: parseFloat(unit.style.left) || 0,
      top: parseFloat(unit.style.top) || 0,
    };
  }

  function destinationKey(point) {
    return `${point.left}:${point.top}`;
  }

  function occupiedDestinationKeys(exceptUnit) {
    const occupied = new Set();

    villagers.forEach((unit) => {
      if (unit === exceptUnit) return;
      const move = activeMoves.get(unit);
      if (move) {
        occupied.add(destinationKey(move.destination));
        return;
      }
      if (unit.dataset.task) {
        occupied.add(destinationKey(getUnitPosition(unit)));
      }
    });

    return occupied;
  }

  function pickDestination(action, unit) {
    const destinations = TASK_DESTINATIONS[action];
    if (!destinations?.length) return null;

    const from = getUnitPosition(unit);
    const occupied = occupiedDestinationKeys(unit);

    const ranked = destinations
      .map((point) => ({
        point,
        occupied: occupied.has(destinationKey(point)),
        dist: (point.left - from.left) ** 2 + (point.top - from.top) ** 2,
      }))
      .sort((a, b) => {
        if (a.occupied !== b.occupied) return a.occupied ? 1 : -1;
        return a.dist - b.dist;
      });

    return ranked[0].point;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }

  function clearWorking(unit) {
    unit.dataset.working = "false";
    unit.classList.remove("is-working");
  }

  function beginWorking(unit) {
    const task = unit.dataset.task;
    if (task === "farm" || task === "mine" || task === "chop-wood") {
      unit.dataset.working = "true";
      unit.classList.add("is-working");
      return;
    }
    clearWorking(unit);
  }

  function stopUnit(unit) {
    activeMoves.delete(unit);
    unit.classList.remove("is-walking");
    unit.dataset.frame = "0";
  }

  function moveUnit(unit, destination) {
    const from = getUnitPosition(unit);
    const dx = destination.left - from.left;
    const dy = destination.top - from.top;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.4) {
      unit.style.left = `${destination.left}%`;
      unit.style.top = `${destination.top}%`;
      stopUnit(unit);
      beginWorking(unit);
      return;
    }

    clearWorking(unit);
    const duration = Math.max(0.5, distance / MOVE_SPEED) * 1000;
    unit.classList.add("is-walking");
    unit.classList.toggle("is-flipped", dx < 0);
    activeMoves.set(unit, {
      from,
      destination,
      start: performance.now(),
      duration,
    });
  }

  function assignVillagerTask(unit, action) {
    if (!unit || !action) return;
    unit.dataset.task = action;
    clearWorking(unit);

    const destination = pickDestination(action, unit);
    if (!destination) return;
    moveUnit(unit, destination);
  }

  function updateMoves(now) {
    activeMoves.forEach((move, unit) => {
      const t = Math.min(1, (now - move.start) / move.duration);
      const progress = easeInOut(t);
      const left =
        move.from.left + (move.destination.left - move.from.left) * progress;
      const top =
        move.from.top + (move.destination.top - move.from.top) * progress;

      unit.style.left = `${left}%`;
      unit.style.top = `${top}%`;
      unit.dataset.frame = String(1 + (Math.floor(now / WALK_FRAME_MS) % 3));

      if (t >= 1) {
        unit.style.left = `${move.destination.left}%`;
        unit.style.top = `${move.destination.top}%`;
        stopUnit(unit);
        beginWorking(unit);
      }
    });
  }

  function animationLoop(now) {
    const dt = Math.min(50, now - lastFrameTime);
    lastFrameTime = now;
    if (!gameOver && !introActive) {
      updateFootmanAggro(dt);
      updateMoves(now);
      updateGoblins(dt);
    }
    requestAnimationFrame(animationLoop);
  }

  units.forEach((unit) => initUnitCombat(unit));
  updateTimer();
  renderCastleHealth();
  renderResources();
  if (introActive) {
    document.querySelector(".game")?.classList.add("is-intro");
    roundIntroContinue?.focus();
  }
  window.setInterval(tick, 1000);
  requestAnimationFrame(animationLoop);

  roundIntroContinue?.addEventListener("click", () => {
    dismissRoundIntro();
  });

  recruitButton?.addEventListener("click", () => {
    openMenuPanel(recruitMenu, recruitButton);
  });

  buildButton?.addEventListener("click", () => {
    openMenuPanel(buildMenu, buildButton);
  });

  resourcesButton?.addEventListener("click", () => {
    renderResources();
    openMenuPanel(resourcesMenu, resourcesButton);
  });

  backdrop?.addEventListener("click", () => {
    closeMenus();
  });

  document.querySelectorAll("[data-close-popup]").forEach((button) => {
    button.addEventListener("click", closeMenus);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (placementType) {
        cancelPlacement();
        return;
      }
      if (openMenu) {
        closeMenus();
        return;
      }
      if (selectedUnit) {
        clearSelection();
      }
    }
  });

  units.forEach((unit) => bindUnitClick(unit));

  villagerMenu?.querySelectorAll("[data-villager-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!selectedUnit) return;
      const action = button.getAttribute("data-villager-action");
      assignVillagerTask(selectedUnit, action);
      closeMenus();
    });
  });

  recruitMenu?.querySelectorAll("[data-recruit]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.getAttribute("data-recruit");
      if (!type || button.disabled) return;
      startRecruit(type);
    });
  });

  buildMenu?.querySelectorAll("[data-build]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.getAttribute("data-build");
      if (!type || button.disabled) return;
      beginPlacement(type);
    });
  });

  const gameEl = document.querySelector(".game");

  gameEl?.addEventListener("pointermove", (event) => {
    if (!placementType) return;
    const point = mapClickToPercent(event);
    if (!point) return;
    setBuildGhostPosition(point);
    updateBuildGhostValidity(point);
  });

  gameEl?.addEventListener("click", (event) => {
    if (event.target.closest(".hud")) return;
    if (event.target.closest(".popup")) return;
    if (event.target.closest(".recruiting-queue")) return;

    if (placementType) {
      if (event.target.closest(".unit")) return;
      const point = mapClickToPercent(event);
      if (point) tryPlaceBuilding(point);
      return;
    }

    if (event.target.closest(".unit")) return;
    if (event.target.closest(".structure")) return;
    if (openMenu) return;

    if (isMilitaryUnit(selectedUnit)) {
      const destination = mapClickToPercent(event);
      if (destination) {
        issueMilitaryMove(selectedUnit, destination);
      }
      return;
    }

    clearSelection();
  });
})();
