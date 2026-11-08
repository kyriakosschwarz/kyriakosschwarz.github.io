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

  var terminal = document.querySelector(".terminal-box");
  if (terminal) {
    var terminalBody = terminal.querySelector(".terminal-body");
    var originalTerminal = terminalBody ? terminalBody.innerHTML : "";
    var terminalSources = [];
    var terminalWrapped = false;
    var measuring = document.createElement("span");

    measuring.setAttribute("aria-hidden", "true");
    measuring.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;";
    document.body.appendChild(measuring);
    terminal.classList.add("terminal-enhanced");

    function escapeHtml(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function tokenize(element) {
      var tokens = [];
      var nodes = element.childNodes;

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        if (node.nodeType === 3) {
          var parts = node.textContent.split(/(\s+)/);

          for (var j = 0; j < parts.length; j++) {
            if (!parts[j]) continue;
            tokens.push({ text: parts[j], space: /^\s+$/.test(parts[j]) });
          }
        } else if (node.nodeType === 1) {
          tokens.push({ text: node.textContent, html: node.outerHTML, space: false });
        }
      }

      return tokens;
    }

    if (terminalBody) {
      var sourceLines = terminalBody.querySelectorAll(".terminal-line");

      for (var i = 0; i < sourceLines.length; i++) {
        var typedSource = sourceLines[i].querySelector(".terminal-typed");

        if (typedSource) {
          terminalSources.push({ tokens: tokenize(typedSource) });
        }
      }
    }

    function syncTerminalFont() {
      var sample = terminalBody && terminalBody.querySelector(".terminal-typed");

      if (!sample) return;

      var style = window.getComputedStyle(sample);
      measuring.style.fontFamily = style.fontFamily;
      measuring.style.fontSize = style.fontSize;
      measuring.style.fontWeight = style.fontWeight;
      measuring.style.fontStyle = style.fontStyle;
      measuring.style.letterSpacing = style.letterSpacing;
    }

    function terminalWidth() {
      var style = window.getComputedStyle(terminalBody);
      var inner = terminalBody.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      var prompt = terminalBody.querySelector(".terminal-prompt");
      var line = terminalBody.querySelector(".terminal-line");
      var gap = line ? parseFloat(window.getComputedStyle(line).columnGap) || 0 : 0;
      var promptWidth = prompt ? prompt.getBoundingClientRect().width : 0;

      return inner - promptWidth - gap;
    }

    function measureSegment(html) {
      measuring.innerHTML = html.replace(/\s+$/, "") + " \\";
      return measuring.getBoundingClientRect().width;
    }

    function splitLine(tokens, width) {
      var lines = [];
      var html = "";
      var text = "";

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var tokenHtml = token.html || escapeHtml(token.text);

        if (text && !token.space && measureSegment(html + tokenHtml) > width) {
          lines.push(html.replace(/\s+$/, ""));
          html = "";
          text = "";
        }

        html += tokenHtml;
        text += token.text;
      }

      if (text.replace(/\s/g, "")) {
        lines.push(html.replace(/\s+$/, ""));
      }

      return lines;
    }

    function wrappedTerminalMarkup(width) {
      var groups = [];
      var total = 0;

      for (var i = 0; i < terminalSources.length; i++) {
        var lines = splitLine(terminalSources[i].tokens, width);
        groups.push(lines);
        total += lines.length;
      }

      if (total <= terminalSources.length) return "";

      var markup = "";

      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];

        for (var l = 0; l < group.length; l++) {
          var isLast = g === groups.length - 1 && l === group.length - 1;
          var continuation = l > 0;
          var className = "terminal-line terminal-line-wrapped" + (continuation ? " terminal-line-cont" : "");

          markup += '<div class="' + className + '">';
          markup += '<span class="terminal-prompt">' + (continuation ? "&gt;" : "$") + "</span>";
          markup += '<span class="terminal-typed terminal-typed-static">' + group[l];

          if (l < group.length - 1) {
            markup += ' <span class="terminal-backslash">\\</span>';
          }

          markup += "</span>";

          if (isLast) {
            markup += '<span class="terminal-cursor terminal-cursor-static" aria-hidden="true"></span>';
          }

          markup += "</div>";
        }
      }

      return markup;
    }

    function layoutTerminal() {
      if (!terminalBody) return;

      syncTerminalFont();
      var width = terminalWidth();

      if (width <= 0) return;

      var markup = wrappedTerminalMarkup(width);

      if (markup && !terminalWrapped) {
        terminalBody.innerHTML = markup;
        terminalWrapped = true;
      } else if (!markup && terminalWrapped) {
        terminalBody.innerHTML = originalTerminal;
        terminalWrapped = false;
      }
    }

    if (terminalSources.length) {
      var resizeTimer;
      window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(layoutTerminal, 150);
      });
      layoutTerminal();
    }
  }
})();
