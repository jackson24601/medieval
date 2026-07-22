(() => {
  const ROUND_SECONDS = 10 * 60;
  const MOVE_SPEED = 11; // map percent per second
  const WALK_FRAME_MS = 140;
  const GATHER_INTERVAL_SECONDS = 10;

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
      sprite: "assets/units/footman.svg",
    },
    archer: {
      label: "Archer",
      food: 75,
      wood: 25,
      stone: 0,
      seconds: 45,
      sprite: "assets/units/archer.svg",
    },
    knight: {
      label: "Knight",
      food: 250,
      wood: 25,
      stone: 0,
      seconds: 120,
      sprite: "assets/units/knight.svg",
    },
  };

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
  const recruitingQueueEl = document.getElementById("recruiting-queue");

  const resources = {
    food: 100,
    wood: 50,
    stone: 25,
  };

  let remainingSeconds = ROUND_SECONDS;
  let gatherCountdown = GATHER_INTERVAL_SECONDS;
  let openMenu = null;
  let selectedUnit = null;
  let nextUnitId = 1;
  let nextRecruitId = 1;

  const units = Array.from(document.querySelectorAll(".unit"));
  const villagers = units.filter((unit) => unit.dataset.unit === "villager");
  const allMenus = [recruitMenu, buildMenu, resourcesMenu, villagerMenu].filter(
    Boolean
  );
  const hudMenuButtons = [recruitButton, buildButton, resourcesButton].filter(
    Boolean
  );
  const activeMoves = new Map();
  const recruitJobs = [];

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

  function renderResources() {
    if (resourceFoodEl) resourceFoodEl.textContent = String(resources.food);
    if (resourceWoodEl) resourceWoodEl.textContent = String(resources.wood);
    if (resourceStoneEl) resourceStoneEl.textContent = String(resources.stone);
    updateRecruitAffordability();
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

  function createRecruitCard(job) {
    const card = document.createElement("div");
    card.className = "recruiting-card";
    card.dataset.recruitId = String(job.id);
    card.innerHTML = `
      <div class="recruiting-card__clock" aria-hidden="true"></div>
      <div class="recruiting-card__copy">
        <div class="recruiting-card__title">Recruiting</div>
        <div class="recruiting-card__unit">${job.label}</div>
        <div class="recruiting-card__time">${formatRecruitClock(job.remaining)}</div>
      </div>
    `;
    return card;
  }

  function updateRecruitCard(job) {
    const timeEl = job.card.querySelector(".recruiting-card__time");
    if (timeEl) timeEl.textContent = formatRecruitClock(job.remaining);
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

  function tick() {
    if (remainingSeconds > 0) {
      remainingSeconds -= 1;
      updateTimer();
    } else {
      updateTimer();
    }

    gatherCountdown -= 1;
    if (gatherCountdown <= 0) {
      gatherCountdown = GATHER_INTERVAL_SECONDS;
      collectResources();
    }

    tickRecruitJobs();
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
    const closeBtn = menu.querySelector("[data-close-popup]");
    if (closeBtn) closeBtn.focus();
  }

  function bindUnitClick(unit) {
    unit.addEventListener("click", (event) => {
      event.stopPropagation();
      if (unit.dataset.unit === "villager") {
        openVillagerMenu(unit);
        return;
      }
      selectUnit(unit);
    });
  }

  function clearSelection() {
    units.forEach((unit) => {
      unit.classList.remove("is-selected");
      unit.setAttribute("aria-pressed", "false");
    });
    selectedUnit = null;
  }

  function selectUnit(unit) {
    if (!unit) return;
    clearSelection();
    unit.classList.add("is-selected");
    unit.setAttribute("aria-pressed", "true");
    selectedUnit = unit;
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
    updateMoves(now);
    requestAnimationFrame(animationLoop);
  }

  updateTimer();
  renderResources();
  window.setInterval(tick, 1000);
  requestAnimationFrame(animationLoop);

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

  document.querySelector(".game")?.addEventListener("click", (event) => {
    if (event.target.closest(".unit")) return;
    if (event.target.closest(".hud")) return;
    if (event.target.closest(".popup")) return;
    if (!openMenu) {
      clearSelection();
    }
  });
})();
