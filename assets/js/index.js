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
    var lastTerminalMarkup = "";
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

      function pushLine() {
        var trimmed = text.replace(/\s+$/, "");
        lines.push({ html: html.replace(/\s+$/, ""), chars: trimmed.length });
      }

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        var tokenHtml = token.html || escapeHtml(token.text);

        if (text && !token.space && measureSegment(html + tokenHtml) > width) {
          pushLine();
          html = "";
          text = "";
        }

        html += tokenHtml;
        text += token.text;
      }

      if (text.replace(/\s/g, "")) {
        pushLine();
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

      var timing = [];
      var start = 0.4;

      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];

        for (var l = 0; l < group.length; l++) {
          var chars = group[l].chars + (l < group.length - 1 ? 2 : 0);
          var duration = Math.max(0.4, chars * 0.055);

          timing.push({
            group: g,
            index: l,
            isLastInGroup: l === group.length - 1,
            isLast: g === groups.length - 1 && l === group.length - 1,
            chars: chars,
            start: start,
            duration: duration
          });

          start += duration + 0.06;

          if (l === group.length - 1 && g < groups.length - 1) {
            start += g === 0 ? 0.9 : 0.35;
          }
        }
      }

      var markup = "";

      for (var t = 0; t < timing.length; t++) {
        var item = timing[t];
        var segment = groups[item.group][item.index];
        var continuation = item.index > 0;
        var lineDelay = item.start.toFixed(2) + "s";
        var className = "terminal-line terminal-line-wrapped" +
          (continuation ? " terminal-line-cont terminal-line-anim" : "");
        var lineStyle = continuation ? ' style="--line-delay:' + lineDelay + '"' : "";

        markup += '<div class="' + className + '"' + lineStyle + '>';
        markup += '<span class="terminal-prompt">' + (continuation ? "&gt;" : "$") + "</span>";
        markup += '<span class="terminal-typed" style="--chars:' + item.chars +
          ";animation-delay:" + lineDelay + ";animation-duration:" + item.duration.toFixed(2) + 's">' +
          segment.html;

        if (!item.isLastInGroup) {
          markup += ' <span class="terminal-backslash">\\</span>';
        }

        markup += "</span>";

        var cursorAnimation = "terminal-blink 1s step-end infinite " + lineDelay + " forwards";

        if (!item.isLast) {
          cursorAnimation += ", terminal-hide 0s " + timing[t + 1].start.toFixed(2) + "s forwards";
        }

        markup += '<span class="terminal-cursor terminal-cursor-dynamic" style="animation:' +
          cursorAnimation + '" aria-hidden="true"></span>';
        markup += "</div>";
      }

      return markup;
    }

    function layoutTerminal() {
      if (!terminalBody) return;

      syncTerminalFont();
      var width = terminalWidth();

      if (width <= 0) return;

      var markup = wrappedTerminalMarkup(width);

      if (markup) {
        if (markup !== lastTerminalMarkup) {
          terminalBody.innerHTML = markup;
          lastTerminalMarkup = markup;
        }

        terminalWrapped = true;
      } else if (terminalWrapped) {
        terminalBody.innerHTML = originalTerminal;
        lastTerminalMarkup = "";
        terminalWrapped = false;
      }
    }

    if (terminalSources.length) {
      var resizeTimer;

      function scheduleLayout() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(layoutTerminal, 150);
      }

      window.addEventListener("resize", scheduleLayout);
      window.addEventListener("orientationchange", scheduleLayout);
      window.addEventListener("load", layoutTerminal);

      if (document.fonts) {
        if (document.fonts.addEventListener) {
          document.fonts.addEventListener("loadingdone", layoutTerminal);
        }

        if (document.fonts.ready && document.fonts.ready.then) {
          document.fonts.ready.then(layoutTerminal);
        }
      }

      window.setTimeout(layoutTerminal, 400);
      window.setTimeout(layoutTerminal, 1200);
      window.setTimeout(layoutTerminal, 2400);
      layoutTerminal();
    }
  }
})();
