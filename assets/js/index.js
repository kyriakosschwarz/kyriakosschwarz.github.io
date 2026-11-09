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
    var cvTabs = Array.prototype.slice.call(cvPage.querySelectorAll("[data-cv-tab]"));
    var cvPanels = Array.prototype.slice.call(cvPage.querySelectorAll("[data-cv-panel]"));
    var cvTabsBar = cvPage.querySelector("[data-cv-tabs]");
    var cvStack = cvPage.querySelector("[data-cv-stack]");
    var cvProgress = cvPage.querySelector("[data-cv-progress]");
    var cvPrev = cvPage.querySelector("[data-cv-prev]");
    var cvNext = cvPage.querySelector("[data-cv-next]");
    var cvActive = 0;

    if (cvTabs.length && cvPanels.length) {
      var cvSelect = function (index, updateHash, userInitiated) {
        if (index < 0 || index >= cvTabs.length) return;

        cvActive = index;

        if (cvProgress) {
          cvProgress.textContent =
            ("0" + (index + 1)).slice(-2) + " / " + ("0" + cvTabs.length).slice(-2);
        }

        cvTabs.forEach(function (tab, tabIndex) {
          var active = tabIndex === index;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
        });

        var panelCount = cvPanels.length;

        cvPanels.forEach(function (panel, panelIndex) {
          var active = panelIndex === index;
          var previous = panelIndex === (index - 1 + panelCount) % panelCount;
          var next = panelIndex === (index + 1) % panelCount;

          panel.classList.toggle("is-active", active);
          panel.classList.toggle("is-prev", !active && previous);
          panel.classList.toggle("is-next", !active && next);
          panel.classList.toggle("is-hidden", !active && !previous && !next);
          panel.setAttribute("aria-hidden", active ? "false" : "true");

          if (active) {
            panel.removeAttribute("inert");
            panel.scrollTop = 0;
          } else {
            panel.setAttribute("inert", "");
          }
        });

        fitDeck();

        if (updateHash) {
          var anchor = cvTabs[index].getAttribute("data-cv-anchor");

          if (anchor) {
            try {
              window.history.replaceState(null, "", "#" + anchor);
            } catch (e) {}
          }
        }

        if (userInitiated && cvPanels[index]) {
          var panelTop = cvPanels[index].getBoundingClientRect().top;

          if (panelTop < 80 && cvPanels[index].scrollIntoView) {
            cvPanels[index].scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }

        if (userInitiated && cvTabsBar && cvTabsBar.scrollWidth > cvTabsBar.clientWidth) {
          cvTabs[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      };

      cvPage.classList.add("is-enhanced");

      if (cvStack) {
        cvStack.classList.add("is-deck");
      }

      var fitDeck = function () {
        if (!cvStack) return;

        var panel = cvPanels[cvActive];
        var inner = panel ? panel.querySelector(".cv-panel-inner") : null;

        if (!inner) return;

        var maxHeight = Math.max(320, Math.round(window.innerHeight * 0.72));
        cvStack.style.height = Math.min(inner.offsetHeight + 2, maxHeight) + "px";
      };

      window.addEventListener("resize", fitDeck);

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fitDeck);
      }

      var initialTab = 0;
      var initialHash = window.location.hash.replace(/^#/, "");

      if (initialHash) {
        for (var cvIndex = 0; cvIndex < cvTabs.length; cvIndex++) {
          if (cvTabs[cvIndex].getAttribute("data-cv-anchor") === initialHash) {
            initialTab = cvIndex;
            break;
          }
        }
      }

      cvSelect(initialTab, false, false);

      if (initialHash && cvPanels[initialTab]) {
        var initialPanelTop = cvPanels[initialTab].getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo(0, Math.max(0, initialPanelTop));
      }

      var cvStep = function (delta) {
        cvSelect((cvActive + delta + cvTabs.length) % cvTabs.length, true, true);
      };

      cvTabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
          cvSelect(index, true, true);
        });

        tab.addEventListener("keydown", function (event) {
          var next = null;

          if (event.key === "ArrowDown" || event.key === "ArrowRight") {
            next = (index + 1) % cvTabs.length;
          } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
            next = (index - 1 + cvTabs.length) % cvTabs.length;
          } else if (event.key === "Home") {
            next = 0;
          } else if (event.key === "End") {
            next = cvTabs.length - 1;
          }

          if (next !== null) {
            event.preventDefault();
            cvSelect(next, true, true);
            cvTabs[next].focus();
          }
        });
      });

      if (cvPrev) {
        cvPrev.addEventListener("click", function () {
          cvStep(-1);
        });
      }

      if (cvNext) {
        cvNext.addEventListener("click", function () {
          cvStep(1);
        });
      }

      if (cvStack) {
        var cvWheelLock = 0;
        var cvTouchStartY = null;
        var cvTouchStartX = null;
        var cvTouchLock = 0;

        var cvAtBoundary = function (direction) {
          var panel = cvPanels[cvActive];

          if (!panel) return true;

          if (direction > 0) {
            return panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1;
          }

          return panel.scrollTop <= 0;
        };

        cvStack.addEventListener("wheel", function (event) {
          var direction = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;

          if (!direction) return;

          var now = Date.now();

          if (now < cvWheelLock) {
            event.preventDefault();
            return;
          }

          if (!cvAtBoundary(direction)) return;

          event.preventDefault();
          cvWheelLock = now + 350;
          cvStep(direction);
        }, { passive: false });

        cvStack.addEventListener("touchstart", function (event) {
          if (event.touches.length !== 1) {
            cvTouchStartY = null;
            return;
          }

          cvTouchStartY = event.touches[0].clientY;
          cvTouchStartX = event.touches[0].clientX;
        }, { passive: true });

        cvStack.addEventListener("touchmove", function (event) {
          if (cvTouchStartY === null) return;

          var touch = event.touches[0];
          var deltaY = cvTouchStartY - touch.clientY;
          var deltaX = cvTouchStartX - touch.clientX;

          if (Math.abs(deltaY) < 48 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

          var direction = deltaY > 0 ? 1 : -1;

          if (!cvAtBoundary(direction)) return;

          var now = Date.now();

          if (now < cvTouchLock) {
            event.preventDefault();
            return;
          }

          event.preventDefault();
          cvTouchLock = now + 350;
          cvTouchStartY = null;
          cvStep(direction);
        }, { passive: false });

        cvStack.addEventListener("touchend", function () {
          cvTouchStartY = null;
        }, { passive: true });
      }

      document.addEventListener("keydown", function (event) {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

        var target = event.target;
        var tagName = target && target.tagName ? target.tagName.toLowerCase() : "";

        if (tagName === "input" || tagName === "textarea" || tagName === "select" ||
            (target && target.isContentEditable)) {
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
        cvStep(delta);
      });

      window.addEventListener("hashchange", function () {
        var hash = window.location.hash.replace(/^#/, "");

        for (var i = 0; i < cvTabs.length; i++) {
          if (cvTabs[i].getAttribute("data-cv-anchor") === hash) {
            cvSelect(i, false, false);
            break;
          }
        }
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
})();
