(() => {
  const ROUND_SECONDS = 10 * 60;

  const timerEl = document.getElementById("round-timer");
  const recruitButton = document.getElementById("recruit-button");
  const buildButton = document.getElementById("build-button");
  const recruitMenu = document.getElementById("recruit-menu");
  const buildMenu = document.getElementById("build-menu");
  const backdrop = document.getElementById("popup-backdrop");

  let remainingSeconds = ROUND_SECONDS;
  let openMenu = null;

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
    [recruitMenu, buildMenu].forEach((menu) => {
      if (menu) menu.hidden = true;
    });
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
    }
    setExpanded(recruitButton, false);
    setExpanded(buildButton, false);
    openMenu = null;
  }

  function openMenuPanel(menu, button) {
    if (!menu || !button) return;
    if (openMenu === menu) {
      closeMenus();
      return;
    }
    closeMenus();
    menu.hidden = false;
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.setAttribute("aria-hidden", "false");
    }
    setExpanded(button, true);
    openMenu = menu;
    const closeBtn = menu.querySelector("[data-close-popup]");
    if (closeBtn) closeBtn.focus();
  }

  updateTimer();
  window.setInterval(tick, 1000);

  recruitButton?.addEventListener("click", () => {
    openMenuPanel(recruitMenu, recruitButton);
  });

  buildButton?.addEventListener("click", () => {
    openMenuPanel(buildMenu, buildButton);
  });

  backdrop?.addEventListener("click", closeMenus);

  document.querySelectorAll("[data-close-popup]").forEach((button) => {
    button.addEventListener("click", closeMenus);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openMenu) {
      closeMenus();
    }
  });
})();
