import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(readArg("--root") ?? path.join(scriptDir, ".."));
const reportDate = new Date().toISOString().slice(0, 10);
const outputPath = path.resolve(
  projectRoot,
  readArg("--output") ?? path.join("docs", "test-reports", `hike-ui-smoke-report-${reportDate}.md`)
);

const chromeCandidates = [
  process.env.CHROME_BIN,
  process.env.BROWSER_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const findings = [];
const passes = [];
const measurements = [];
const networkRequests = [];
const tileNetworkRequests = [];
const failedRuntimeResponses = [];
const requestById = new Map();
const browserErrors = [];

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function addFinding(scope, message, severity = "follow-up") {
  findings.push({ scope, message, severity });
}

function addPass(message) {
  passes.push(message);
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findChromeExecutable() {
  for (const candidate of chromeCandidates) {
    if (candidate && (await pathExists(candidate))) return candidate;
  }
  return null;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") reject(new Error("Could not allocate a TCP port"));
        else resolve(address.port);
      });
    });
  });
}

async function waitFor(callback, { timeoutMs = 10_000, intervalMs = 100, label = "condition" } = {}) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await callback();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ""}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 0;
    this.callbacks = new Map();
    this.handlers = new Map();
  }

  static async connect(webSocketUrl) {
    const client = new CdpClient(webSocketUrl);
    await client.open();
    return client;
  }

  open() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.webSocketUrl);
      this.socket.addEventListener("open", () => resolve());
      this.socket.addEventListener("error", () => reject(new Error(`Could not connect to ${this.webSocketUrl}`)), { once: true });
      this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
      this.socket.addEventListener("close", () => {
        for (const { reject: rejectCallback } of this.callbacks.values()) {
          rejectCallback(new Error("CDP socket closed"));
        }
        this.callbacks.clear();
      });
    });
  }

  handleMessage(data) {
    const message = JSON.parse(String(data));
    if (message.id && this.callbacks.has(message.id)) {
      const { resolve, reject } = this.callbacks.get(message.id);
      this.callbacks.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ""}`));
      else resolve(message.result ?? {});
      return;
    }

    if (message.method && this.handlers.has(message.method)) {
      for (const handler of this.handlers.get(message.method)) handler(message.params ?? {});
    }
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.socket.send(payload);
    });
  }

  close() {
    this.socket?.close();
  }
}

async function startVite() {
  const server = await createViteServer({
    root: projectRoot,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false
    }
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Could not read Vite server address");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function launchBrowser(chromePath) {
  const debugPort = await getFreePort();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "hike-ui-smoke-"));
  const child = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--no-default-browser-check",
      "--no-first-run",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  await waitFor(
    async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => null);
      return response?.ok;
    },
    { timeoutMs: 10_000, label: "browser CDP endpoint" }
  ).catch((error) => {
    child.kill();
    throw new Error(`${error.message}${stderr ? `\nBrowser stderr:\n${stderr}` : ""}`);
  });

  return { child, debugPort, userDataDir };
}

async function stopBrowser(browser) {
  if (!browser) return;
  if (browser.child && browser.child.exitCode === null) {
    browser.child.kill();
    const exited = await Promise.race([
      new Promise((resolve) => browser.child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(() => resolve(false), 2_000))
    ]);
    if (exited === false && browser.child.exitCode === null) {
      browser.child.kill("SIGKILL");
      await Promise.race([
        new Promise((resolve) => browser.child.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 2_000))
      ]);
    }
  }
  if (browser.userDataDir) {
    await rm(browser.userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  }
}

async function createPage(debugPort) {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/new`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create browser tab: HTTP ${response.status}`);
  const target = await response.json();
  if (!target.webSocketDebuggerUrl) throw new Error("Browser tab did not expose a websocket debugger URL");
  return CdpClient.connect(target.webSocketDebuggerUrl);
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Runtime.evaluate failed");
  }
  return result.result?.value;
}

async function waitForText(client, text) {
  await waitFor(() => evaluate(client, `document.body?.innerText.includes(${JSON.stringify(text)})`), {
    timeoutMs: 12_000,
    label: `text "${text}"`
  });
}

async function settleTrackedRequests() {
  const startedAt = Date.now();
  let previousCount = networkRequests.length + tileNetworkRequests.length;
  let stableSince = Date.now();
  while (Date.now() - startedAt < 1_200) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const currentCount = networkRequests.length + tileNetworkRequests.length;
    if (currentCount !== previousCount) {
      previousCount = currentCount;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 350) {
      return;
    }
  }
}

async function clickButton(client, text) {
  const result = await evaluate(
    client,
    `(() => {
      const target = ${JSON.stringify(text)};
      const normalize = (value) => value.replace(/\\s+/g, " ").trim().toLowerCase();
      const targetText = normalize(target);
      const buttons = [...document.querySelectorAll("button")];
      const button = buttons.find((candidate) => {
        const text = normalize(candidate.textContent ?? "");
        return text.includes(targetText) && !text.startsWith("star ") && !text.startsWith("unstar ");
      });
      if (!button) return { ok: false, buttons: buttons.slice(0, 25).map((candidate) => normalize(candidate.textContent ?? "")) };
      button.click();
      return { ok: true, text: normalize(button.textContent ?? "") };
    })()`
  );
  if (!result?.ok) throw new Error(`Could not find button containing "${text}". Visible buttons: ${(result?.buttons ?? []).join(" | ")}`);
}

async function clickFirstContextRoute(client) {
  const result = await evaluate(
    client,
    `(() => {
      const button = document.querySelector(".context-route");
      if (!button) return { ok: false };
      button.click();
      return { ok: true, text: button.textContent?.replace(/\\s+/g, " ").trim() ?? "" };
    })()`
  );
  if (!result?.ok) throw new Error("Could not find a context route button to toggle.");
  await waitFor(
    () => evaluate(client, `document.querySelector(".context-route")?.getAttribute("aria-pressed") === "true"`),
    { timeoutMs: 6_000, label: `context route selection${result.text ? ` (${result.text})` : ""}` }
  );
}

async function setSelectByLabel(client, labelText, value, { containerSelector = "body" } = {}) {
  const selector = `${containerSelector} label.select-field`;
  const result = await evaluate(
    client,
    `(() => {
      const normalize = (value) => value.replace(/\\s+/g, " ").trim().toLowerCase();
      const labels = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const label = labels.find((candidate) => normalize(candidate.querySelector("span")?.textContent ?? "") === normalize(${JSON.stringify(labelText)}));
      if (!label) return { ok: false, labels: labels.map((candidate) => normalize(candidate.querySelector("span")?.textContent ?? candidate.textContent ?? "")) };
      const select = label.querySelector("select");
      if (!select) return { ok: false, labels: ["label found without select"] };
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return { ok: true, value: select.value, options: [...select.options].map((option) => option.value) };
    })()`
  );
  if (!result?.ok || result.value !== value) {
    throw new Error(
      `Could not set select "${labelText}" to "${value}". Current value: ${result?.value ?? "(missing)"}. Options: ${(result?.options ?? []).join(" | ")}. Visible labels: ${(result?.labels ?? []).join(" | ")}`
    );
  }
}

async function setViewport(client, width, height, mobile = false) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  });
}

function installObservers(client, origin) {
  client.on("Network.requestWillBeSent", (params) => {
    try {
      const url = new URL(params.request.url);
      requestById.set(params.requestId, { origin: url.origin, path: url.pathname, url: params.request.url });
      if (url.hostname.includes("tile.openstreetmap.org")) {
        tileNetworkRequests.push({ method: params.request.method, url: params.request.url });
      }
      if (url.origin === origin) {
        networkRequests.push({ method: params.request.method, path: url.pathname });
      }
    } catch {
      // Ignore non-URL devtools payloads.
    }
  });
  client.on("Network.loadingFailed", (params) => {
    const request = requestById.get(params.requestId);
    if (!params.canceled && request?.origin === origin && (request.path.startsWith("/data/") || request.path.startsWith("/routes/"))) {
      failedRuntimeResponses.push({ path: request.path, status: "loading-failed", text: params.errorText });
    }
  });
  client.on("Network.responseReceived", (params) => {
    try {
      const url = new URL(params.response.url);
      if (url.origin === origin && (url.pathname.startsWith("/data/") || url.pathname.startsWith("/routes/")) && params.response.status >= 400) {
        failedRuntimeResponses.push({ path: url.pathname, status: params.response.status, text: params.response.statusText });
      }
    } catch {
      // Ignore non-URL devtools payloads.
    }
  });
  client.on("Runtime.exceptionThrown", (params) => {
    browserErrors.push(params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? "Browser exception");
  });
  client.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") browserErrors.push(params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") || "Console error");
  });
}

async function injectTextZoom(client) {
  await evaluate(
    client,
    `(() => {
      let style = document.querySelector("#ui-smoke-text-zoom");
      if (!style) {
        style = document.createElement("style");
        style.id = "ui-smoke-text-zoom";
        document.head.appendChild(style);
      }
      style.textContent = "html { font-size: 32px !important; }";
      return true;
    })()`
  );
}

async function clearTextZoom(client) {
  await evaluate(client, `document.querySelector("#ui-smoke-text-zoom")?.remove()`);
}

async function collectLayout(client, label) {
  const snapshot = await evaluate(
    client,
    `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const maxScrollWidth = Math.max(doc.scrollWidth, body?.scrollWidth ?? 0);
      const viewportWidth = doc.clientWidth;
      const selectors = [
        ".app-shell",
        ".sidebar",
        ".content",
        ".overview",
        ".builder-toolbar",
        ".builder-workspace",
        ".map-with-controls",
        ".section-list",
        ".route-map"
      ];
      const elements = selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return { selector, present: false };
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector,
          present: true,
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          overflowY: style.overflowY,
          maxHeight: style.maxHeight
        };
      });
      const overflowElements = [...document.body.querySelectorAll("*")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const label = [
            element.tagName.toLowerCase(),
            element.id ? "#" + element.id : "",
            element.className && typeof element.className === "string"
              ? "." + element.className.trim().replace(/\\s+/g, ".")
              : ""
          ].join("");
          const text = (element.textContent ?? "").replace(/\\s+/g, " ").trim().slice(0, 80);
          return {
            label,
            text,
            inLeaflet: Boolean(element.closest(".leaflet-container")),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            overflowX: style.overflowX
          };
        })
        .filter((element) => element.right > viewportWidth + 4 || element.scrollWidth > element.clientWidth + 4)
        .sort((a, b) => Math.max(b.right - viewportWidth, b.scrollWidth - b.clientWidth) - Math.max(a.right - viewportWidth, a.scrollWidth - a.clientWidth))
        .slice(0, 8);
      const actionableOverflowElements = overflowElements.filter(
        (element) => !element.inLeaflet && element.overflowX !== "auto"
      );
      const actionableHorizontalOverflowPx = Math.max(
        0,
        ...actionableOverflowElements.map((element) => element.right - viewportWidth)
      );
      const actionableInternalOverflowPx = Math.max(
        0,
        ...actionableOverflowElements.map((element) => element.scrollWidth - element.clientWidth)
      );
      const focusableCount = [...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.disabled && getComputedStyle(element).display !== "none")
        .length;
      return {
        label: ${JSON.stringify(label)},
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollWidth: maxScrollWidth,
        clientWidth: viewportWidth,
        rawHorizontalOverflowPx: Math.max(0, maxScrollWidth - viewportWidth),
        horizontalOverflowPx: actionableHorizontalOverflowPx,
        internalOverflowPx: actionableInternalOverflowPx,
        documentHeight: Math.max(doc.scrollHeight, body?.scrollHeight ?? 0),
        focusableCount,
        elements,
        overflowElements
      };
    })()`
  );
  measurements.push(snapshot);
  if (snapshot.horizontalOverflowPx > 4) {
    addFinding(label, `Horizontal overflow is ${snapshot.horizontalOverflowPx}px at ${snapshot.viewport.width}x${snapshot.viewport.height}.`, "layout");
  } else if (snapshot.internalOverflowPx > 8) {
    addFinding(label, `Internal content overflow is ${snapshot.internalOverflowPx}px at ${snapshot.viewport.width}x${snapshot.viewport.height}.`, "layout");
  } else {
    addPass(`${label}: no meaningful horizontal overflow.`);
  }
  return snapshot;
}

async function collectAccessibility(client) {
  const result = await evaluate(
    client,
    `(() => {
      const text = (value) => value?.replace(/\\s+/g, " ").trim() ?? "";
      return {
        searchInputs: [...document.querySelectorAll(".search-field input")].map((input) => ({
          ariaLabel: text(input.getAttribute("aria-label")),
          placeholder: text(input.getAttribute("placeholder"))
        })),
        activityButtons: [...document.querySelectorAll(".activity-switch")].map((button) => ({
          text: text(button.textContent),
          pressed: button.getAttribute("aria-pressed")
        })),
        sectionRows: [...document.querySelectorAll(".section-row")].map((button) => button.getAttribute("aria-pressed")),
        contextRoutes: [...document.querySelectorAll(".context-route")].map((button) => button.getAttribute("aria-pressed")),
        disclosureButtons: [...document.querySelectorAll(".facility-group-toggle")].map((button) => ({
          text: text(button.textContent),
          expanded: button.getAttribute("aria-expanded")
        })),
        mapTabIndex: document.querySelector(".leaflet-container")?.getAttribute("tabindex") ?? null
      };
    })()`
  );

  if (!result.searchInputs.length || result.searchInputs.some((input) => !input.ariaLabel)) {
    addFinding("accessibility", "One or more search inputs are missing accessible names.", "accessibility");
  } else {
    addPass("Search inputs expose accessible names.");
  }
  if (!result.activityButtons.length) {
    addPass("Activity switch is temporarily hidden while the app focuses on hiking.");
  } else if (result.activityButtons.some((button) => button.pressed !== "true" && button.pressed !== "false")) {
    addFinding("accessibility", "Activity switch buttons are missing aria-pressed state.", "accessibility");
  } else {
    addPass("Activity switch buttons expose pressed state.");
  }
  if (result.sectionRows.length && result.sectionRows.some((value) => value !== "true" && value !== "false")) {
    addFinding("accessibility", "Route section buttons are missing aria-pressed state.", "accessibility");
  } else if (result.sectionRows.length) {
    addPass("Route section buttons expose pressed state.");
  }
  if (result.contextRoutes.length && result.contextRoutes.some((value) => value !== "true" && value !== "false")) {
    addFinding("accessibility", "Context route buttons are missing aria-pressed state.", "accessibility");
  } else if (result.contextRoutes.length) {
    addPass("Context route buttons expose pressed state.");
  }
  if (result.disclosureButtons.length && result.disclosureButtons.some((button) => button.expanded !== "true" && button.expanded !== "false")) {
    addFinding("accessibility", "Disclosure buttons are missing aria-expanded state.", "accessibility");
  } else if (result.disclosureButtons.length) {
    addPass("Disclosure buttons expose expanded state.");
  }
  if (result.mapTabIndex === "0") {
    addFinding("accessibility", "Leaflet map container is keyboard-focusable despite no deliberate keyboard map mode.", "accessibility");
  } else {
    addPass("Leaflet map container is not a noisy keyboard tab stop.");
  }

  return result;
}

async function collectPrintChecks(client, label) {
  await client.send("Emulation.setEmulatedMedia", { media: "print" });
  try {
    const result = await evaluate(
      client,
      `(() => {
        const sectionList = document.querySelector(".section-list");
        const mapWithControls = document.querySelector(".map-with-controls");
        const facilityPanels = [...document.querySelectorAll(".facility-panel.collapsed")];
        const transitPanels = [...document.querySelectorAll(".transit-panel.collapsed")];
        const sectionStyle = sectionList ? getComputedStyle(sectionList) : null;
        const mapStyle = mapWithControls ? getComputedStyle(mapWithControls) : null;
        return {
          sectionListPresent: Boolean(sectionList),
          sectionOverflowY: sectionStyle?.overflowY ?? null,
          sectionMaxHeight: sectionStyle?.maxHeight ?? null,
          mapWithControlsDisplay: mapStyle?.display ?? null,
          collapsedFacilityPanels: facilityPanels.length,
          collapsedFacilityPanelsPrinted: facilityPanels.filter((panel) => getComputedStyle(panel).display !== "none").length,
          collapsedTransitPanels: transitPanels.length,
          collapsedTransitPanelsPrinted: transitPanels.filter((panel) => getComputedStyle(panel).display !== "none").length
        };
      })()`
    );
    measurements.push({ label, print: result });
    if (result.sectionListPresent && (result.sectionOverflowY !== "visible" || result.sectionMaxHeight !== "none")) {
      addFinding(label, "Print mode still clips the route-builder section list.", "print");
    } else if (result.sectionListPresent) {
      addPass(`${label}: route-builder section list expands in print.`);
    }
    if (result.mapWithControlsDisplay && result.mapWithControlsDisplay !== "none") {
      addFinding(label, "Print mode still displays interactive map controls.", "print");
    } else if (result.mapWithControlsDisplay) {
      addPass(`${label}: interactive map controls are hidden in print.`);
    }
    if (
      result.collapsedFacilityPanels &&
      result.collapsedFacilityPanelsPrinted !== result.collapsedFacilityPanels
    ) {
      addFinding(label, "Collapsed facility panels stay hidden in print.", "print");
    } else if (result.collapsedFacilityPanels) {
      addPass(`${label}: collapsed facility panels are printable.`);
    }
    if (result.collapsedTransitPanels && result.collapsedTransitPanelsPrinted !== result.collapsedTransitPanels) {
      addFinding(label, "Collapsed transit panels stay hidden in print.", "print");
    } else if (result.collapsedTransitPanels) {
      addPass(`${label}: collapsed transit panels are printable.`);
    }
    return result;
  } finally {
    await client.send("Emulation.setEmulatedMedia", { media: "screen" }).catch(() => {});
  }
}

async function exerciseUi(client, origin) {
  await client.send("Network.enable");
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  installObservers(client, origin);

  await setViewport(client, 390, 844);
  await client.send("Page.navigate", { url: `${origin}/` });
  await waitForText(client, "Hiking Routes");
  await collectLayout(client, "390x844 mobile hiking overview");
  await collectAccessibility(client);
  await settleTrackedRequests();

  const mobileBuilderRequestBaseline = requestSummary();
  await clickButton(client, "Sörmlandsleden");
  await waitForText(client, "Build Route");
  await setSelectByLabel(client, "Start", "sormlandsleden-stage-1", { containerSelector: ".trail-builder" });
  await setSelectByLabel(client, "End", "sormlandsleden-stage-6", { containerSelector: ".trail-builder" });
  await waitFor(() => evaluate(client, `document.querySelectorAll(".context-route").length > 0`), {
    timeoutMs: 6_000,
    label: "context route buttons"
  });
  await clickFirstContextRoute(client);
  await collectLayout(client, "390x844 mobile Sörmlandsleden builder");
  await collectAccessibility(client);
  await settleTrackedRequests();
  const mobileBuilderRequests = requestSummary();
  const mobileRouteRequestDelta = mobileBuilderRequests.routes - mobileBuilderRequestBaseline.routes;
  const mobileTileRequestDelta = mobileBuilderRequests.tiles - mobileBuilderRequestBaseline.tiles;
  if (mobileRouteRequestDelta > 0) {
    addFinding(
      "mobile map deferral",
      `Below-fold mobile route-builder map requested ${mobileRouteRequestDelta} route payload(s) before it was near the viewport.`,
      "performance"
    );
  }
  if (mobileTileRequestDelta > 0) {
    addFinding(
      "mobile map deferral",
      `Below-fold mobile route-builder map requested ${mobileTileRequestDelta} tile request(s) before it was near the viewport.`,
      "performance"
    );
  }
  if (mobileRouteRequestDelta === 0 && mobileTileRequestDelta === 0) {
    addPass("Below-fold mobile route-builder map did not request route GeoJSON or tiles before it was near the viewport.");
  }
  await collectPrintChecks(client, "Sörmlandsleden builder print");

  await injectTextZoom(client);
  await collectLayout(client, "390x844 mobile Sörmlandsleden builder at 200% text");
  await setViewport(client, 1024, 768, false);
  await collectLayout(client, "1024x768 desktop Sörmlandsleden builder at 200% text");
  await clearTextZoom(client);
  await collectLayout(client, "1024x768 desktop Sörmlandsleden builder");

  await clickButton(client, "Select route and view info");
  await waitForText(client, "Facilities");
  await collectLayout(client, "1024x768 Sörmlandsleden info");
  await collectAccessibility(client);
  await collectPrintChecks(client, "Sörmlandsleden info print");

  await clickButton(client, "Back to overview");
  await waitForText(client, "Hiking Routes");
  await settleTrackedRequests();

  const finalRequests = requestSummary();
  const maxHikingRouteRequests = 20;
  if (finalRequests.hikingRoutes > maxHikingRouteRequests) {
    addFinding(
      "trail-system route loading",
      `The smoke flow requested ${finalRequests.hikingRoutes} hiking /routes/** payloads; selected/context route loading should stay at or below ${maxHikingRouteRequests}.`,
      "performance"
    );
  } else {
    addPass(
      `Selected/context hiking route loading stayed within budget (${finalRequests.hikingRoutes}/${maxHikingRouteRequests} hiking /routes/** requests).`
    );
  }

  if (failedRuntimeResponses.length) {
    for (const failure of failedRuntimeResponses) {
      addFinding("runtime request", `${failure.path} failed (${failure.status} ${failure.text ?? ""})`, "runtime");
    }
  } else {
    addPass("No /data/** or /routes/** runtime requests failed.");
  }

  if (browserErrors.length) {
    for (const error of browserErrors) addFinding("browser console", error, "runtime");
  } else {
    addPass("No browser console/runtime errors were observed.");
  }
}

function requestSummary() {
  const dataRequests = networkRequests.filter((request) => request.path.startsWith("/data/"));
  const routeRequests = networkRequests.filter((request) => request.path.startsWith("/routes/"));
  const hikingRouteRequests = routeRequests.filter((request) => !request.path.startsWith("/routes/kayaking/"));
  const kayakRouteRequests = routeRequests.filter((request) => request.path.startsWith("/routes/kayaking/"));
  return {
    total: networkRequests.length,
    unique: new Set(networkRequests.map((request) => request.path)).size,
    data: dataRequests.length,
    routes: routeRequests.length,
    hikingRoutes: hikingRouteRequests.length,
    kayakRoutes: kayakRouteRequests.length,
    tiles: tileNetworkRequests.length
  };
}

function formatFindings() {
  if (!findings.length) return "- No new smoke findings were detected by the scripted checks.";
  return findings
    .map((finding) => `- ${finding.severity}: ${finding.scope} - ${finding.message}`)
    .join("\n");
}

function formatMeasurements() {
  return measurements
    .map((measurement) => {
      if (measurement.print) {
        const print = measurement.print;
        return [
          `### ${measurement.label}`,
          "",
          "| Check | Value |",
          "|---|---:|",
          `| Section list present | ${print.sectionListPresent ? "yes" : "no"} |`,
          `| Section overflow-y | ${print.sectionOverflowY ?? "n/a"} |`,
          `| Section max-height | ${print.sectionMaxHeight ?? "n/a"} |`,
          `| Map controls display | ${print.mapWithControlsDisplay ?? "n/a"} |`,
          `| Collapsed facility panels printable | ${print.collapsedFacilityPanelsPrinted}/${print.collapsedFacilityPanels} |`,
          `| Collapsed transit panels printable | ${print.collapsedTransitPanelsPrinted}/${print.collapsedTransitPanels} |`
        ].join("\n");
      }

      const notable = measurement.elements
        .filter((element) => element.present)
        .map((element) => `${element.selector} ${element.width}x${element.height} top=${element.top} right=${element.right}`)
        .join("<br>");
      const overflow = measurement.overflowElements?.length
        ? measurement.overflowElements
            .map(
              (element) =>
                `${element.label} right=${element.right} width=${element.width} scroll=${element.scrollWidth}/${element.clientWidth} overflow=${element.overflowX} text="${element.text}"`
            )
            .join("<br>")
        : "none";
      return [
        `### ${measurement.label}`,
        "",
        "| Metric | Value |",
        "|---|---:|",
        `| Viewport | ${measurement.viewport.width}x${measurement.viewport.height} |`,
        `| Actionable horizontal overflow | ${measurement.horizontalOverflowPx}px |`,
        `| Internal content overflow | ${measurement.internalOverflowPx}px |`,
        `| Raw scroll overflow | ${measurement.rawHorizontalOverflowPx}px |`,
        `| Document height | ${measurement.documentHeight}px |`,
        `| Focusable controls | ${measurement.focusableCount} |`,
        `| Key elements | ${notable || "n/a"} |`,
        `| Overflow candidates | ${overflow} |`
      ].join("\n");
    })
    .join("\n\n");
}

function renderReport({ chromePath, origin }) {
  const requests = requestSummary();
  return [
    "# Hike Library Scripted UI Smoke Report",
    "",
    `Date: ${reportDate}`,
    `Target: ${origin}`,
    `Workspace tested: ${projectRoot}`,
    `Browser: ${chromePath}`,
    "Generated by: `npm run ui:smoke`",
    "",
    "## Summary",
    "",
    findings.length
      ? `The scripted smoke pass completed and found ${findings.length} item(s) to review.`
      : "The scripted smoke pass completed without new findings.",
    "",
    "## Coverage",
    "",
    "- Hiking overview at mobile width.",
    "- Sörmlandsleden route builder with a range that exposes related route options.",
    "- 200% text zoom checks at mobile and desktop widths.",
    "- Print-media checks for route-builder and route-info states.",
    "- Basic accessibility state checks for search, the temporary hiking-only activity state, route buttons, disclosures, and Leaflet focus noise.",
    "- Local hiking-route request budget for selected/context route geometry loading.",
    "",
    "## Findings",
    "",
    formatFindings(),
    "",
    "## Passed Checks",
    "",
    passes.length ? passes.map((pass) => `- ${pass}`).join("\n") : "- No pass assertions were recorded.",
    "",
    "## Runtime Request Summary",
    "",
    "| Metric | Count |",
    "|---|---:|",
    `| Total local requests | ${requests.total} |`,
    `| Unique local paths | ${requests.unique} |`,
    `| /data/** requests | ${requests.data} |`,
    `| /routes/** requests | ${requests.routes} |`,
    `| Hiking /routes/** requests | ${requests.hikingRoutes} |`,
    `| Kayak /routes/** requests | ${requests.kayakRoutes} |`,
    `| Tile requests tracked | ${requests.tiles} |`,
    "",
    "## Measurements",
    "",
    formatMeasurements(),
    "",
    "## Not Covered",
    "",
    "- This is not a screenshot or pixel-regression suite.",
    "- It does not replace manual keyboard/screen-reader review.",
    "- It does not test every route, every filter combination, or every mobile breakpoint from the older reports.",
    "- Browser availability is still required; set `CHROME_BIN` or `BROWSER_BIN` if auto-discovery fails.",
    "",
    "## Follow-Up",
    "",
    "- Use this report as a fast regression snapshot after implementation slices.",
    "- Keep `docs/data-pipeline.md` as the milestone ledger; this report records the current smoke result only.",
    ""
  ].join("\n");
}

async function main() {
  const chromePath = await findChromeExecutable();
  if (!chromePath) {
    throw new Error("Could not find Chrome/Chromium. Set CHROME_BIN or BROWSER_BIN to run the UI smoke report.");
  }

  let vite;
  let browser;
  let client;
  try {
    vite = await startVite();
    browser = await launchBrowser(chromePath);
    client = await createPage(browser.debugPort);
    await exerciseUi(client, vite.origin);
    const report = renderReport({ chromePath, origin: vite.origin });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, report);
    console.log(`UI smoke report written to ${path.relative(projectRoot, outputPath)}`);
    console.log(findings.length ? `Smoke findings: ${findings.length}` : "Smoke findings: 0");
    if (findings.length) process.exitCode = 1;
  } finally {
    try {
      client?.close();
    } catch {
      // Best-effort cleanup.
    }
    await stopBrowser(browser);
    if (vite?.server) await vite.server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
