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

    var visibleProjectCards = function () {
      return projectCards.filter(function (card) {
        return !card.hidden;
      });
    };

    var moveProjectFocus = function (card, key) {
      var visibleCards = visibleProjectCards();

      if (!visibleCards.length) return false;

      var rects = visibleCards.map(function (item) {
        return {
          card: item,
          top: item.offsetTop,
          left: item.offsetLeft
        };
      });

      var currentTop = card.offsetTop;
      var row = rects.filter(function (item) {
        return Math.abs(item.top - currentTop) <= 2;
      }).sort(function (a, b) {
        return a.left - b.left;
      });

      var column = -1;

      for (var i = 0; i < row.length; i++) {
        if (row[i].card === card) {
          column = i;
          break;
        }
      }

      if (column === -1) return false;

      if (key === "ArrowLeft" || key === "ArrowRight") {
        var nextColumn = column + (key === "ArrowRight" ? 1 : -1);

        if (nextColumn < 0 || nextColumn >= row.length) return false;

        row[nextColumn].card.focus();
        return true;
      }

      var rows = [];

      rects.forEach(function (item) {
        if (rows.indexOf(item.top) === -1) {
          rows.push(item.top);
        }
      });

      rows.sort(function (a, b) {
        return a - b;
      });

      var rowIndex = rows.indexOf(currentTop);
      var nextRowIndex = rowIndex + (key === "ArrowDown" ? 1 : -1);

      if (rowIndex === -1 || nextRowIndex < 0 || nextRowIndex >= rows.length) return false;

      var nextRow = rects.filter(function (item) {
        return Math.abs(item.top - rows[nextRowIndex]) <= 2;
      }).sort(function (a, b) {
        return a.left - b.left;
      });

      nextRow[Math.min(column, nextRow.length - 1)].card.focus();
      return true;
    };

    projectCards.forEach(function (card) {
      card.addEventListener("keydown", function (event) {
        if (event.key === "Home" || event.key === "End") {
          var visibleCards = visibleProjectCards();

          if (!visibleCards.length) return;

          event.preventDefault();
          visibleCards[event.key === "Home" ? 0 : visibleCards.length - 1].focus();
          return;
        }

        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(event.key) === -1) return;

        if (moveProjectFocus(card, event.key)) {
          event.preventDefault();
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (document.querySelector("dialog[open]")) return;

      var target = event.target;
      var tagName = target && target.tagName ? target.tagName.toLowerCase() : "";

      if (tagName === "input" || tagName === "textarea" || tagName === "select" ||
          (target && target.isContentEditable)) {
        return;
      }

      if (target && target.closest && target.closest("[data-project-open]")) return;

      var visibleCards = visibleProjectCards();

      if (!visibleCards.length) return;

      if (event.key === "Enter" &&
          (target === document.body || target === document.documentElement ||
           (target && target.closest && target.closest("main")))) {
        event.preventDefault();
        visibleCards[0].click();
        return;
      }

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].indexOf(event.key) === -1) return;

      event.preventDefault();

      var card;

      if (event.key === "Home") {
        card = visibleCards[0];
      } else if (event.key === "End") {
        card = visibleCards[visibleCards.length - 1];
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        card = visibleCards[visibleCards.length - 1];
      } else {
        card = visibleCards[0];
      }

      card.focus();
    });

    var projectCounter = projectDialog ? projectDialog.querySelector("[data-project-counter]") : null;
    var projectPrevButton = projectDialog ? projectDialog.querySelector("[data-project-prev]") : null;
    var projectNextButton = projectDialog ? projectDialog.querySelector("[data-project-next]") : null;
    var projectVisibleCards = [];
    var projectCurrentIndex = -1;

    if (projectDialog && projectDialogContent) {
      var projectCleanup = function () {
        document.body.classList.remove("dialog-open");

        if (projectTrigger) {
          projectTrigger.focus();
          projectTrigger = null;
        }

        if (projectDialogContent) {
          projectDialogContent.innerHTML = "";
        }

        projectVisibleCards = [];
        projectCurrentIndex = -1;

        if (window.location.hash.indexOf("#project-detail-") === 0) {
          try {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          } catch (e) {}
        }
      };

      var renderProject = function (card) {
        var id = card.getAttribute("data-project-open");
        var template = document.getElementById("project-detail-" + id);

        if (!template) return false;

        projectDialogContent.innerHTML = "";
        projectDialogContent.appendChild(template.content.cloneNode(true));

        Array.prototype.forEach.call(projectDialogContent.querySelectorAll("img"), function (image) {
          image.loading = "eager";
          image.fetchPriority = "high";

          if (image.decode) {
            image.decode().catch(function () {});
          }
        });

        if (projectCounter) {
          projectCounter.textContent =
            ("0" + (projectCurrentIndex + 1)).slice(-2) + " / " + ("0" + projectVisibleCards.length).slice(-2);
        }

        try {
          window.history.replaceState(null, "", "#" + "project-detail-" + id);
        } catch (e) {}

        return true;
      };

      var openProject = function (card) {
        projectVisibleCards = projectCards.filter(function (item) {
          return !item.hidden;
        });

        var index = projectVisibleCards.indexOf(card);

        if (index === -1) return;

        projectCurrentIndex = index;
        projectTrigger = card;

        if (!renderProject(card)) return;

        document.body.classList.add("dialog-open");

        if (typeof projectDialog.showModal === "function") {
          projectDialog.showModal();
        } else {
          projectDialog.setAttribute("open", "");
        }

        var closeButton = projectDialog.querySelector("[data-project-close]");

        if (closeButton) {
          closeButton.focus();
        }
      };

      var navigateProject = function (delta) {
        if (!projectVisibleCards.length) return;

        projectCurrentIndex = (projectCurrentIndex + delta + projectVisibleCards.length) % projectVisibleCards.length;
        projectTrigger = projectVisibleCards[projectCurrentIndex];
        renderProject(projectVisibleCards[projectCurrentIndex]);
      };

      var closeProjectDialog = function () {
        if (typeof projectDialog.close === "function" && projectDialog.open) {
          projectDialog.close();
          projectCleanup();
        } else {
          projectDialog.removeAttribute("open");
          projectCleanup();
        }
      };

      projectCards.forEach(function (card) {
        card.addEventListener("click", function () {
          openProject(card);
        });
      });

      if (projectPrevButton) {
        projectPrevButton.addEventListener("click", function () {
          navigateProject(-1);
        });
      }

      if (projectNextButton) {
        projectNextButton.addEventListener("click", function () {
          navigateProject(1);
        });
      }

      projectDialog.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          navigateProject(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          navigateProject(1);
        }
      });

      var projectTouchStartX = null;
      var projectTouchStartY = null;

      projectDialog.addEventListener("touchstart", function (event) {
        if (event.touches.length !== 1) {
          projectTouchStartX = null;
          return;
        }

        projectTouchStartX = event.touches[0].clientX;
        projectTouchStartY = event.touches[0].clientY;
      }, { passive: true });

      projectDialog.addEventListener("touchend", function (event) {
        if (projectTouchStartX === null) return;

        var deltaX = projectTouchStartX - event.changedTouches[0].clientX;
        var deltaY = projectTouchStartY - event.changedTouches[0].clientY;

        projectTouchStartX = null;

        if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        navigateProject(deltaX > 0 ? 1 : -1);
      }, { passive: true });

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

      var initialProjectHash = window.location.hash.replace(/^#/, "");

      if (initialProjectHash.indexOf("project-detail-") === 0) {
        var initialProjectCard = projectCards.filter(function (card) {
          return "project-detail-" + card.getAttribute("data-project-open") === initialProjectHash;
        })[0];

        if (initialProjectCard && !initialProjectCard.hidden) {
          openProject(initialProjectCard);
        }
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
  var navShortcutKeys = { h: "home", c: "cv", p: "projects", k: "puzzles" };

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
