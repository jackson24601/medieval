(() => {
  const ROUND_SECONDS = 10 * 60;

  const timerEl = document.getElementById("round-timer");
  const recruitButton = document.getElementById("recruit-button");
  const buildButton = document.getElementById("build-button");
  const recruitMenu = document.getElementById("recruit-menu");
  const buildMenu = document.getElementById("build-menu");
  const villagerMenu = document.getElementById("villager-menu");
  const backdrop = document.getElementById("popup-backdrop");

  let remainingSeconds = ROUND_SECONDS;
  let openMenu = null;
  let selectedUnit = null;

  const units = Array.from(document.querySelectorAll(".unit"));
  const allMenus = [recruitMenu, buildMenu, villagerMenu].filter(Boolean);

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
    setExpanded(recruitButton, false);
    setExpanded(buildButton, false);
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

  updateTimer();
  window.setInterval(tick, 1000);

  recruitButton?.addEventListener("click", () => {
    openMenuPanel(recruitMenu, recruitButton);
  });

  buildButton?.addEventListener("click", () => {
    openMenuPanel(buildMenu, buildButton);
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
      selectedUnit.dataset.task = action || "";
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
