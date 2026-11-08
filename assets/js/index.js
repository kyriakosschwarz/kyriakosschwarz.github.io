(function () {
  var storageKey = "theme";
  var body = document.body;
  var toggle = document.getElementById("theme-toggle");
  var label = document.getElementById("theme-toggle-label");

  function storedTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (e) {
      return null;
    }
  }

  function applyTheme(theme) {
    var isDark = theme !== "light";
    body.classList.toggle("dark", isDark);

    if (toggle) {
      toggle.setAttribute("aria-pressed", String(isDark));
      toggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }

    if (label) {
      label.textContent = isDark ? "Dark" : "Light";
    }
  }

  applyTheme(storedTheme() === "light" ? "light" : "dark");

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = body.classList.contains("dark") ? "light" : "dark";

      try {
        localStorage.setItem(storageKey, next);
      } catch (e) {}

      applyTheme(next);
    });
  }
})();
