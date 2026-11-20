export function mountProjectDemos(root, apiPrefix = "") {
  const first = root.querySelector("#demo-2");
  if (!first || first.dataset.mounted) return;
  first.dataset.mounted = "true";

  for (let number = 2; number <= 7; number++) {
    root.querySelector(`#demo-${number}`).append(
      root.querySelector(`#tool-${number}`).content.cloneNode(true)
    );
  }

  function wire(number, run) {
    const panel = root.querySelector(`#demo-${number}`);
    const form = panel.querySelector("form");
    const button = form.querySelector("button[type=submit]");
    const status = form.querySelector("output");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      status.textContent = "Working…";
      try {
        status.textContent = await run(panel, new FormData(form));
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    return form;
  }

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function card(title, ...content) {
    const article = element("article");
    article.append(element("h3", title), ...content);
    return article;
  }

  async function ask(path, text) {
    const response = await fetch(apiPrefix + path, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text}),
    });
    if (!response.ok) throw new Error((await response.json()).error ?? "The request failed.");
    return response;
  }

  function setAudio(audio, blob) {
    audio.pause();
    if (audio.dataset.url) URL.revokeObjectURL(audio.dataset.url);
    audio.dataset.url = URL.createObjectURL(blob);
    audio.src = audio.dataset.url;
    audio.hidden = false;
  }

  const queueKey = "ops-brain-sandbox-queue";
  function showQueue(panel, queue) {
    panel.querySelector(".demo-results").replaceChildren(...queue.map((post) =>
      card(`Scheduled · ${post.destination ?? "Sandbox"}`, element("p", post.text),
        element("p", `Approved revision · ${new Date(post.when).toLocaleString()}`))
    ));
  }
  const hub = wire(2, (panel, fields) => {
    const text = fields.get("text").trim();
    const when = new Date(fields.get("time"));
    const destination = fields.get("destination");
    if (!text || !(when.getTime() > Date.now()) || !fields.has("approval")) {
      throw new Error("Approve the post and choose a future publish time.");
    }
    const queue = JSON.parse(localStorage.getItem(queueKey) ?? "[]");
    if (queue.some((post) =>
      post.text === text && post.when === when.toISOString() && post.destination === destination
    )) {
      throw new Error("This revision is already queued at that time.");
    }
    queue.unshift({text, when: when.toISOString(), destination});
    localStorage.setItem(queueKey, JSON.stringify(queue));
    showQueue(panel, queue);
    hub.elements.approval.checked = false;
    return "Scheduled in the local queue.";
  });
  try {
    showQueue(root.querySelector("#demo-2"), JSON.parse(localStorage.getItem(queueKey) ?? "[]"));
  } catch (error) {
    hub.querySelector("output").textContent = "Local queue storage is unavailable.";
  }
  const future = new Date(Date.now() + 60 * 60 * 1000);
  hub.elements.time.value = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  hub.elements.text.addEventListener("input", () => { hub.elements.approval.checked = false; });

  wire(3, async (panel, fields) => {
    const results = panel.querySelector(".demo-results");
    results.replaceChildren();
    const {drafts} = await (await ask("/drafts", fields.get("text"))).json();
    const labels = {
      brand_x: "Brand · X", brand_linkedin: "Brand · LinkedIn",
      founder_x: "Founder · X", founder_linkedin: "Founder · LinkedIn",
    };
    results.replaceChildren(...Object.entries(labels).map(([key, label]) =>
      card(label, element("p", drafts[key]))
    ));
    return "Four drafts generated.";
  });

  function wrap(context, text, maxWidth) {
    const lines = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = "";
        for (const letter of word) {
          if (context.measureText(line + letter).width > maxWidth) {
            lines.push(line);
            line = "";
          }
          line += letter;
        }
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function imageDownload(canvas, label, filename) {
    const figure = element("figure");
    const image = element("img");
    image.alt = label;
    image.src = canvas.toDataURL("image/png");
    const caption = element("figcaption");
    const link = element("a", `Download ${label}`);
    link.href = image.src;
    link.download = filename;
    caption.append(link);
    figure.append(image, caption);
    return figure;
  }

  wire(4, (panel, fields) => {
    const title = fields.get("text").trim();
    const steps = fields.get("slides").split("\n").map((line) => line.trim()).filter(Boolean);
    if (!title || steps.length !== 4 || steps.some((line) => line.length > 120)) {
      throw new Error("Enter a title and exactly four lines, each up to 120 characters.");
    }
    const slides = [title, ...steps].map((copy, index) => {
      const canvas = element("canvas");
      canvas.width = canvas.height = 720;
      const paint = canvas.getContext("2d");
      paint.fillStyle = index === 0 ? "#173f36" : "#f1e6c9";
      paint.fillRect(0, 0, 720, 720);
      paint.fillStyle = index === 0 ? "#fff7e2" : "#173f36";
      paint.font = "bold 24px system-ui";
      paint.fillText("JUST SORTD", 52, 80);
      paint.fillText(`${index + 1} / 5`, 606, 656);
      paint.font = `bold ${index === 0 ? 64 : 56}px system-ui`;
      const lines = wrap(paint, copy, 616);
      if (lines.length > 7) throw new Error(`Slide ${index + 1} needs shorter copy.`);
      lines.forEach((line, row) => paint.fillText(line, 52, 148 + row * 62));
      return imageDownload(canvas, `slide ${index + 1}`, `slide-${index + 1}.png`);
    });
    panel.querySelector(".demo-results").replaceChildren(...slides);
    return "Five slides rendered.";
  });

  const clipSignals = [
    [/mistake|biggest lesson/i, 3, "opens with a specific mistake or lesson"],
    [/try this|start with/i, 2, "offers an actionable tip"],
    [/before|next time|the reason/i, 1, "explains the consequence or reasoning"],
  ];
  function timecode(seconds) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  wire(5, async (panel) => {
    const video = panel.querySelector("video");
    if (!video.src) {
      const source = await fetch(apiPrefix + "/yap-video");
      if (!source.ok) throw new Error("Could not load the sample recording.");
      video.src = URL.createObjectURL(await source.blob());
      video.hidden = false;
    }
    video.pause();
    video.ontimeupdate = null;
    const response = await fetch(apiPrefix + "/yap-transcript");
    if (!response.ok) throw new Error("Could not load the sample transcript.");
    const segments = await response.json();
    const clips = segments.map((segment) => {
      const hits = clipSignals.filter(([pattern]) => pattern.test(segment.text));
      return {
        ...segment,
        score: hits.reduce((total, [, weight]) => total + weight, 0),
        reason: hits.map(([, , reason]) => reason).join("; "),
      };
    }).sort((first, second) => second.score - first.score || first.start - second.start).slice(0, 3);
    panel.querySelector(".demo-results").replaceChildren(...clips.map((clip) => {
      const play = element("button", "Play clip");
      play.type = "button";
      play.addEventListener("click", async () => {
        video.ontimeupdate = null;
        video.currentTime = clip.start;
        video.ontimeupdate = () => {
          if (!video.seeking && video.currentTime >= clip.end) video.pause();
        };
        try {
          await video.play();
        } catch (error) {
          panel.querySelector("output").textContent = "The clip could not play. Try the video controls.";
        }
      });
      return card(`${timecode(clip.start)}–${timecode(clip.end)}`, element("p", clip.text),
        element("p", `Why: ${clip.reason}`), play);
    }));
    return "Three clips selected from the sample transcript.";
  });

  let animationFrame;
  wire(6, async (panel, fields) => {
    const script = fields.get("text").trim();
    const scenes = script.split(/(?<=[.!?])\s+/).filter(Boolean);
    const audio = panel.querySelector("audio");
    const canvas = panel.querySelector("canvas");
    const caption = panel.querySelector(".current-caption");
    const paint = canvas.getContext("2d");
    const voice = await (await ask("/voice", script)).blob();
    setAudio(audio, voice);
    canvas.hidden = caption.hidden = false;
    const weights = scenes.map((scene) => scene.split(/\s+/).length);
    const total = weights.reduce((sum, size) => sum + size, 0);

    function render() {
      const progress = Number.isFinite(audio.duration) ? audio.currentTime / audio.duration : 0;
      let index = 0;
      let boundary = weights[0];
      while (index < scenes.length - 1 && progress * total >= boundary) {
        index++;
        boundary += weights[index];
      }
      paint.fillStyle = ["#163c35", "#244857", "#543e57"][index % 3];
      paint.fillRect(0, 0, 960, 540);
      paint.fillStyle = "#f3db9d";
      paint.beginPath();
      paint.arc(824, 104, 38 + 16 * Math.sin(audio.currentTime * 3), 0, Math.PI * 2);
      paint.fill();
      paint.font = "bold 24px system-ui";
      paint.fillText(`JUST SORTD  /  ${index + 1} OF ${scenes.length}`, 58, 80);
      paint.font = "bold 44px system-ui";
      const lines = wrap(paint, scenes[index], 820);
      lines.slice(0, 6).forEach((line, row) => paint.fillText(line, 58, 160 + row * 53));
      paint.fillRect(0, 530, 960 * progress, 10);
      if (caption.textContent !== scenes[index]) caption.textContent = scenes[index];
    }

    function animate() {
      render();
      if (!audio.paused) animationFrame = requestAnimationFrame(animate);
    }
    audio.onplay = () => {
      cancelAnimationFrame(animationFrame);
      animate();
    };
    audio.onseeked = render;
    audio.onloadedmetadata = render;
    audio.onended = render;
    render();
    return "Explainer ready. Press play to watch with narration.";
  });

  function characterFrame(scene, index) {
    const canvas = element("canvas");
    canvas.width = 600;
    canvas.height = 420;
    const paint = canvas.getContext("2d");
    paint.fillStyle = scene === "Reading room" ? "#d7bc96" : "#b3d9c7";
    paint.fillRect(0, 0, 600, 420);
    for (let item = 0; item < 6; item++) {
      paint.fillStyle = scene === "Reading room" ? "#8f5f42" : "#4f8a70";
      const x = 32 + item * 96;
      paint.fillRect(x, 100 + (item % 3) * 22, 21, 196);
    }
    paint.fillStyle = "#224439";
    paint.fillRect(0, 330, 600, 90);
    paint.save();
    paint.translate(index === 1 ? 335 : 285, 215);
    paint.scale(index === 1 ? 1.18 : 1, index === 1 ? 1.18 : 1);
    function oval(x, y, wide, tall, color) {
      paint.fillStyle = color;
      paint.beginPath();
      paint.ellipse(x, y, wide, tall, 0, 0, Math.PI * 2);
      paint.fill();
    }
    oval(0, 5, 83, 102, "#75442e");
    oval(-29, -18, 32, 40, "#f7dca9");
    oval(29, -18, 32, 40, "#f7dca9");
    oval(-29, -20, 11, 16, "#222b2b");
    oval(29, -20, 11, 16, "#222b2b");
    oval(0, 7, 12, 9, "#e39a39");
    paint.fillStyle = "#45947e";
    paint.fillRect(-65, 48, 130, 21);
    paint.fillRect(25, 62, 21, 44);
    paint.restore();
    paint.fillStyle = "#f7efd9";
    paint.font = "bold 24px system-ui";
    paint.fillText(`MISO · ${scene}`, 24, 382);
    return canvas;
  }

  wire(7, async (panel, fields) => {
    const dialogue = fields.get("text").trim();
    const voice = await (await ask("/voice", dialogue)).blob();
    const scenes = ["Reading room", "Reading room", "Garden"];
    panel.querySelector(".demo-results").replaceChildren(...scenes.map((scene, index) =>
      imageDownload(characterFrame(scene, index), `shot ${index + 1}`, `miso-shot-${index + 1}.png`)
    ));
    setAudio(panel.querySelector("audio"), voice);
    return "Three shots and a dialogue line are ready.";
  });
}
