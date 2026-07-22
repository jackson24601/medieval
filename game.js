(() => {
  const ROUND_SECONDS = 10 * 60;
  const MOVE_SPEED = 11; // map percent per second
  const WALK_FRAME_MS = 140;

  const TASK_DESTINATIONS = {
    farm: [
      { left: 18, top: 50 },
      { left: 80, top: 48 },
      { left: 22, top: 64 },
      { left: 74, top: 62 },
    ],
    mine: [{ left: 84, top: 16 }],
    "chop-wood": [
      { left: 14, top: 28 },
      { left: 48, top: 18 },
      { left: 90, top: 58 },
      { left: 60, top: 78 },
    ],
    "return-to-castle": [{ left: 50, top: 50 }],
  };

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

  const resources = {
    food: 100,
    wood: 50,
    stone: 25,
  };

  let remainingSeconds = ROUND_SECONDS;
  let openMenu = null;
  let selectedUnit = null;

  const units = Array.from(document.querySelectorAll(".unit"));
  const allMenus = [recruitMenu, buildMenu, resourcesMenu, villagerMenu].filter(
    Boolean
  );
  const hudMenuButtons = [recruitButton, buildButton, resourcesButton].filter(
    Boolean
  );
  const activeMoves = new Map();

  function renderResources() {
    if (resourceFoodEl) resourceFoodEl.textContent = String(resources.food);
    if (resourceWoodEl) resourceWoodEl.textContent = String(resources.wood);
    if (resourceStoneEl) resourceStoneEl.textContent = String(resources.stone);
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

  function tick() {
    if (remainingSeconds <= 0) {
      updateTimer();
      return;
    }
    remainingSeconds -= 1;
    updateTimer();
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
    const closeBtn = menu.querySelector("[data-close-popup]");
    if (closeBtn) closeBtn.focus();
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

  function nearestDestination(from, destinations) {
    let best = destinations[0];
    let bestDist = Infinity;
    destinations.forEach((point) => {
      const dist =
        (point.left - from.left) ** 2 + (point.top - from.top) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = point;
      }
    });
    return best;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
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
      stopUnit(unit);
      return;
    }

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
    const destinations = TASK_DESTINATIONS[action];
    if (!destinations?.length) return;
    const from = getUnitPosition(unit);
    const destination = nearestDestination(from, destinations);
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

  units.forEach((unit) => {
    unit.addEventListener("click", (event) => {
      event.stopPropagation();
      if (unit.dataset.unit === "villager") {
        openVillagerMenu(unit);
        return;
      }
      selectUnit(unit);
    });
  });

  villagerMenu?.querySelectorAll("[data-villager-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!selectedUnit) return;
      const action = button.getAttribute("data-villager-action");
      assignVillagerTask(selectedUnit, action);
      closeMenus();
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
