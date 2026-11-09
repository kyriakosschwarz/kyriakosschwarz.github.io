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


  var cvPage = document.querySelector("[data-cv]");

  if (cvPage) {
    var cvTabs = Array.prototype.slice.call(cvPage.querySelectorAll("[data-cv-jump]"));
    var cvPanels = Array.prototype.slice.call(cvPage.querySelectorAll("[data-cv-panel]"));
    var cvProgress = cvPage.querySelector("[data-cv-progress]");
    var cvPrev = cvPage.querySelector("[data-cv-prev]");
    var cvNext = cvPage.querySelector("[data-cv-next]");
    var cvActive = 0;
    var cvScrollLock = 0;

    if (cvTabs.length && cvPanels.length) {
      var cvSetActive = function (index) {
        if (index < 0 || index >= cvTabs.length) return;

        cvActive = index;

        cvTabs.forEach(function (tab, tabIndex) {
          var active = tabIndex === index;
          tab.classList.toggle("is-active", active);

          if (active) {
            tab.setAttribute("aria-current", "true");
          } else {
            tab.removeAttribute("aria-current");
          }
        });

        if (cvProgress) {
          cvProgress.textContent =
            ("0" + (index + 1)).slice(-2) + " / " + ("0" + cvTabs.length).slice(-2);
        }
      };

      var cvGoTo = function (index, updateHash) {
        if (index < 0 || index >= cvPanels.length) return;

        cvSetActive(index);
        cvScrollLock = Date.now() + 800;
        cvPanels[index].scrollIntoView({ behavior: "smooth", block: "start" });

        if (updateHash) {
          var anchor = cvTabs[index].getAttribute("data-cv-jump");

          if (anchor) {
            try {
              window.history.replaceState(null, "", "#" + anchor);
            } catch (e) {}
          }
        }
      };

      cvTabs.forEach(function (tab, index) {
        tab.addEventListener("click", function (event) {
          event.preventDefault();
          cvGoTo(index, true);
        });
      });

      if (cvPrev) {
        cvPrev.addEventListener("click", function () {
          cvGoTo((cvActive - 1 + cvPanels.length) % cvPanels.length, true);
        });
      }

      if (cvNext) {
        cvNext.addEventListener("click", function () {
          cvGoTo((cvActive + 1) % cvPanels.length, true);
        });
      }

      var cvSyncFromScroll = function () {
        if (Date.now() < cvScrollLock) return;

        var offset = window.innerWidth <= 900 ? 110 : 160;
        var active = 0;

        for (var i = 0; i < cvPanels.length; i++) {
          if (cvPanels[i].getBoundingClientRect().top - offset <= 0) {
            active = i;
          } else {
            break;
          }
        }

        if (active !== cvActive) {
          cvSetActive(active);
        }
      };

      var cvTicking = false;

      window.addEventListener("scroll", function () {
        if (cvTicking) return;

        cvTicking = true;
        window.requestAnimationFrame(function () {
          cvTicking = false;
          cvSyncFromScroll();
        });
      }, { passive: true });

      var initialHash = window.location.hash.replace(/^#/, "");

      if (initialHash) {
        for (var cvIndex = 0; cvIndex < cvTabs.length; cvIndex++) {
          if (cvTabs[cvIndex].getAttribute("data-cv-jump") === initialHash) {
            cvSetActive(cvIndex);
            break;
          }
        }
      } else {
        cvSetActive(0);
      }

      document.addEventListener("keydown", function (event) {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (document.querySelector("dialog[open]")) return;

        var target = event.target;
        var tagName = target && target.tagName ? target.tagName.toLowerCase() : "";

        if (tagName === "input" || tagName === "textarea" || tagName === "select" ||
            (target && target.isContentEditable)) {
          return;
        }

        if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          cvGoTo(event.key === "Home" ? 0 : cvPanels.length - 1, true);
          return;
        }

        if (event.key >= "1" && event.key <= "9") {
          var jumpIndex = Number(event.key) - 1;

          if (jumpIndex < cvPanels.length) {
            event.preventDefault();
            cvGoTo(jumpIndex, true);
          }

          return;
        }

        var delta = 0;

        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          delta = -1;
        } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          delta = 1;
        }

        if (!delta) return;

        event.preventDefault();
        cvGoTo((cvActive + delta + cvPanels.length) % cvPanels.length, true);
      });
    }
  }

  var projectsHub = document.querySelector("[data-projects]");

  if (projectsHub) {
    var projectFilters = Array.prototype.slice.call(projectsHub.querySelectorAll("[data-project-filter]"));
    var projectCards = Array.prototype.slice.call(projectsHub.querySelectorAll("[data-project-open]"));
    var projectCount = projectsHub.querySelector("[data-project-count]");
    var projectDialog = document.getElementById("project-dialog");
    var projectDialogContent = projectDialog ? projectDialog.querySelector("[data-project-dialog-content]") : null;
    var projectTrigger = null;

    var projectCleanup = function () {
      document.body.classList.remove("dialog-open");

      if (projectTrigger) {
        projectTrigger.focus();
        projectTrigger = null;
      }

      if (projectDialogContent) {
        projectDialogContent.innerHTML = "";
      }
    };

    var applyProjectFilter = function (filter) {
      var shown = 0;

      projectFilters.forEach(function (button) {
        var active = button.getAttribute("data-project-filter") === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      projectCards.forEach(function (card) {
        var show = filter === "all" || card.getAttribute("data-project-category") === filter;
        card.hidden = !show;

        if (show) shown++;
      });

      if (projectCount) {
        projectCount.textContent = shown + (shown === 1 ? " project" : " projects");
      }
    };

    projectFilters.forEach(function (button) {
      button.addEventListener("click", function () {
        applyProjectFilter(button.getAttribute("data-project-filter"));
      });
    });

    var projectImageQueue = [];

    Array.prototype.forEach.call(projectsHub.querySelectorAll("template"), function (template) {
      Array.prototype.forEach.call(template.content.querySelectorAll("img"), function (image) {
        var src = image.getAttribute("src");

        if (src && projectImageQueue.indexOf(src) === -1) {
          projectImageQueue.push(src);
        }
      });
    });

    var preloadProjectImage = function (src, priority) {
      var image = new window.Image();

      image.decoding = "async";

      if (priority) {
        image.fetchPriority = priority;
      }

      image.onload = function () {
        if (image.decode) {
          image.decode().catch(function () {});
        }
      };

      image.src = src;
    };

    var preloadProjectImages = function () {
      projectImageQueue.forEach(function (src) {
        preloadProjectImage(src, "low");
      });
    };

    window.setTimeout(preloadProjectImages, 80);

    var preloadProjectCardImages = function (card) {
      if (card.getAttribute("data-images-warmed") === "true") return;

      card.setAttribute("data-images-warmed", "true");

      var template = document.getElementById("project-detail-" + card.getAttribute("data-project-open"));

      if (!template) return;

      Array.prototype.forEach.call(template.content.querySelectorAll("img"), function (image) {
        var src = image.getAttribute("src");

        if (src) {
          preloadProjectImage(src, "high");
        }
      });
    };

    projectCards.forEach(function (card) {
      ["mouseenter", "focus", "pointerdown", "touchstart"].forEach(function (eventName) {
        card.addEventListener(eventName, function () {
          preloadProjectCardImages(card);
        }, { passive: true });
      });
    });

    projectCards.forEach(function (card) {
      card.addEventListener("keydown", function (event) {
        var visibleCards = projectCards.filter(function (item) {
          return !item.hidden;
        });
        var index = visibleCards.indexOf(card);

        if (index === -1) return;

        var next = null;

        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          next = (index + 1) % visibleCards.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          next = (index - 1 + visibleCards.length) % visibleCards.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = visibleCards.length - 1;
        }

        if (next === null) return;

        event.preventDefault();
        visibleCards[next].focus();
      });
    });

    if (projectDialog && projectDialogContent) {
      var closeProjectDialog = function () {
        if (typeof projectDialog.close === "function" && projectDialog.open) {
          projectDialog.close();
        } else {
          projectDialog.removeAttribute("open");
          projectCleanup();
        }
      };

      projectCards.forEach(function (card) {
        card.addEventListener("click", function () {
          var id = card.getAttribute("data-project-open");
          var template = document.getElementById("project-detail-" + id);

          if (!template) return;

          projectDialogContent.innerHTML = "";
          projectDialogContent.appendChild(template.content.cloneNode(true));
          projectTrigger = card;
          document.body.classList.add("dialog-open");

          Array.prototype.forEach.call(projectDialogContent.querySelectorAll("img"), function (image) {
            image.loading = "eager";
            image.fetchPriority = "high";

            if (image.decode) {
              image.decode().catch(function () {});
            }
          });

          if (typeof projectDialog.showModal === "function") {
            projectDialog.showModal();
          } else {
            projectDialog.setAttribute("open", "");
          }

          var closeButton = projectDialog.querySelector("[data-project-close]");

          if (closeButton) {
            closeButton.focus();
          }
        });
      });

      projectDialog.addEventListener("click", function (event) {
        if (event.target === projectDialog) {
          closeProjectDialog();
        }
      });

      projectDialog.addEventListener("close", projectCleanup);

      var projectCloseButton = projectDialog.querySelector("[data-project-close]");

      if (projectCloseButton) {
        projectCloseButton.addEventListener("click", closeProjectDialog);
      }
    }
  }

  var helpDialog = document.getElementById("keyboard-help");
  var helpOpenButton = document.querySelector("[data-keyboard-help]");
  var helpCloseButton = document.querySelector("[data-keyboard-help-close]");

  var cleanupKeyboardHelp = function () {
    document.body.classList.remove("keyboard-help-open");

    if (helpOpenButton) {
      helpOpenButton.focus();
    }
  };

  var openKeyboardHelp = function () {
    if (!helpDialog) return;

    document.body.classList.add("keyboard-help-open");

    if (typeof helpDialog.showModal === "function") {
      helpDialog.showModal();
    } else {
      helpDialog.setAttribute("open", "");
    }

    if (helpCloseButton) {
      helpCloseButton.focus();
    }
  };

  var closeKeyboardHelp = function () {
    if (!helpDialog) return;

    if (typeof helpDialog.close === "function" && helpDialog.open) {
      helpDialog.close();
    } else {
      helpDialog.removeAttribute("open");
      cleanupKeyboardHelp();
    }
  };

  if (helpDialog) {
    if (helpOpenButton) {
      helpOpenButton.addEventListener("click", openKeyboardHelp);
    }

    if (helpCloseButton) {
      helpCloseButton.addEventListener("click", closeKeyboardHelp);
    }

    helpDialog.addEventListener("click", function (event) {
      if (event.target === helpDialog) {
        closeKeyboardHelp();
      }
    });

    helpDialog.addEventListener("close", cleanupKeyboardHelp);
  }

  var navShortcuts = {};
  var navShortcutKeys = { h: "home", c: "cv", p: "projects" };

  Object.keys(navShortcutKeys).forEach(function (key) {
    var link = document.querySelector('[data-nav="' + navShortcutKeys[key] + '"]');

    if (link) {
      navShortcuts[key] = link.getAttribute("href");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.repeat) return;

    var target = event.target;
    var tagName = target && target.tagName ? target.tagName.toLowerCase() : "";

    if (tagName === "input" || tagName === "textarea" || tagName === "select" ||
        (target && target.isContentEditable)) {
      return;
    }

    var key = event.key.toLowerCase();
    var openDialog = document.querySelector("dialog[open]");

    if (openDialog) {
      if (key === "?" && helpDialog && helpDialog.open) {
        event.preventDefault();
        closeKeyboardHelp();
      }

      return;
    }

    if (key === "?") {
      event.preventDefault();
      openKeyboardHelp();
      return;
    }

    if (key === "t") {
      var toggle = document.getElementById("theme-toggle");

      if (toggle) {
        event.preventDefault();
        toggle.click();
      }

      return;
    }

    if (navShortcuts[key]) {
      event.preventDefault();
      window.location.href = navShortcuts[key];
    }
  });
})();
