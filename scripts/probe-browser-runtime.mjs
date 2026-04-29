import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(parseRootArg(process.argv.slice(2)) ?? path.join(scriptDir, ".."));

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

const expectedRequests = [
  "/data/library-index.json",
  "/data/overviews/hiking.geojson",
  "/data/trail-systems/roslagsleden/manifest.json",
  "/data/trail-systems/roslagsleden/sections-index.json",
  "/data/trail-systems/roslagsleden/route-groups.json",
  "/data/trail-systems/roslagsleden/presets.json",
  "/data/trail-systems/roslagsleden/sections/roslagsleden-stage-1.json",
  "/data/trail-systems/sormlandsleden/manifest.json",
  "/data/trail-systems/sormlandsleden/sections-index.json",
  "/data/trail-systems/sormlandsleden/route-groups.json",
  "/data/trail-systems/sormlandsleden/presets.json",
  "/data/trail-systems/sormlandsleden/sections/sormlandsleden-stage-1.json"
];

const forbiddenRequestPatterns = [
  { label: "legacy hikes-index fallback", pattern: /^\/data\/hikes-index\.json$/ },
  { label: "legacy trail-system all-in-one JSON", pattern: /^\/data\/trail-systems\/[^/]+\.json$/ },
  { label: "research-only path", pattern: /(^|\/)research(\/|$)/ },
  { label: "app-owned source input path", pattern: /^\/data\/source\// },
  { label: "source snapshot path", pattern: /source-snapshot/ },
  { label: "candidate trail research path", pattern: /candidate-trails/ },
  { label: "kayak seed research path", pattern: /stockholm-kayak-archipelago-research/ }
];

const errors = [];
const appRequests = [];
const appRequestById = new Map();
const failedRuntimeResponses = [];
const browserErrors = [];

function parseRootArg(args) {
  const index = args.indexOf("--root");
  return index === -1 ? undefined : args[index + 1];
}

function addError(scope, message) {
  errors.push({ scope, message });
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function kayakFilterExpectations() {
  const index = await readJson(path.join(projectRoot, "public", "data", "library-index.json"));
  const kayaks = index.filter((item) => item.activity === "kayaking" && item.itemType === "kayak-trip");
  const count = ({ waterZone = "all", exposure = "all", confidence = "all" } = {}) =>
    kayaks.filter(
      (item) =>
        (waterZone === "all" || item.waterZone === waterZone) &&
        (exposure === "all" || item.exposureLevel === exposure) &&
        (confidence === "all" || item.routeConfidence === confidence)
    ).length;

  return {
    total: kayaks.length,
    outer: count({ waterZone: "outer" }),
    exposed: count({ exposure: "exposed" }),
    outerExposed: count({ waterZone: "outer", exposure: "exposed" }),
    lowConfidence: count({ confidence: "low" })
  };
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
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`
  };
}

async function launchBrowser(chromePath) {
  const debugPort = await getFreePort();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "hike-browser-probe-"));
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
  const expression = `document.body?.innerText.includes(${JSON.stringify(text)})`;
  await waitFor(() => evaluate(client, expression), { timeoutMs: 12_000, label: `text "${text}"` });
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
      if (!button) return { ok: false, buttons: buttons.slice(0, 20).map((candidate) => normalize(candidate.textContent ?? "")) };
      button.click();
      return { ok: true, text: normalize(button.textContent ?? "") };
    })()`
  );
  if (!result?.ok) {
    throw new Error(`Could not find button containing "${text}". Visible buttons: ${(result?.buttons ?? []).join(" | ")}`);
  }
  return result.text;
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
  await waitFor(
    () => evaluate(client, `document.querySelectorAll(${JSON.stringify(selector)}).length > 0`),
    { timeoutMs: 6_000, label: `${containerSelector} select fields` }
  );
  const result = await evaluate(
    client,
    `(() => {
      const normalize = (value) => value.replace(/\\s+/g, " ").trim().toLowerCase();
      const labels = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const label = labels.find((candidate) => normalize(candidate.querySelector("span")?.textContent ?? "") === normalize(${JSON.stringify(labelText)}));
      if (!label) {
        return {
          ok: false,
          labels: labels.map((candidate) => normalize(candidate.querySelector("span")?.textContent ?? candidate.textContent ?? "")),
          body: normalize(document.body?.innerText ?? "").slice(0, 500)
        };
      }
      const select = label.querySelector("select");
      if (!select) return { ok: false, labels: ["label found without select"] };
      select.value = ${JSON.stringify(value)};
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        ok: true,
        value: select.value,
        labels: labels.map((candidate) => normalize(candidate.querySelector("span")?.textContent ?? candidate.textContent ?? "")),
        options: [...select.options].map((option) => option.value)
      };
    })()`
  );
  if (!result?.ok || result.value !== value) {
    throw new Error(
      `Could not set select "${labelText}" to "${value}". Current value: ${result?.value ?? "(missing)"}. Options: ${(result?.options ?? []).join(" | ")}. Visible labels: ${(result?.labels ?? []).join(" | ")}. Body: ${result?.body ?? ""}`
    );
  }
}

async function waitForSidebarRouteCount(client, expected, total) {
  const expectedText = `${expected} of ${total} routes`;
  await waitFor(
    () =>
      evaluate(
        client,
        `(() => {
          const value = document.querySelector(".brand span")?.textContent?.replace(/\\s+/g, " ").trim() ?? "";
          return value === ${JSON.stringify(expectedText)} ? value : false;
        })()`
      ),
    { timeoutMs: 6_000, label: `sidebar route count ${expectedText}` }
  );
}

function installNetworkObservers(client, origin) {
  client.on("Network.requestWillBeSent", (params) => {
    try {
      const url = new URL(params.request.url);
      if (url.origin === origin) {
        appRequestById.set(params.requestId, url.pathname);
        appRequests.push({
          method: params.request.method,
          path: url.pathname,
          url: params.request.url
        });
      }
    } catch {
      // Ignore non-URL devtools payloads.
    }
  });
  client.on("Network.loadingFailed", (params) => {
    const pathname = appRequestById.get(params.requestId);
    if (!params.canceled && pathname && (pathname.startsWith("/data/") || pathname.startsWith("/routes/"))) {
      failedRuntimeResponses.push({ path: pathname, status: "loading-failed", text: params.errorText });
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
    if (params.type === "error") {
      browserErrors.push(params.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") || "Console error");
    }
  });
}

function requestPaths() {
  return appRequests.map((request) => request.path);
}

function requestSeen(pathname) {
  return appRequests.some((request) => request.path === pathname);
}

function kayakDetailRuntimeRequests() {
  return requestPaths().filter((pathname) => pathname.startsWith("/data/kayak-trips/") || pathname.startsWith("/routes/kayaking/"));
}

function hikingRouteRequestPaths() {
  return requestPaths().filter((pathname) => pathname.startsWith("/routes/") && !pathname.startsWith("/routes/kayaking/"));
}

async function settleBrowserRequests() {
  const startedAt = Date.now();
  let previousCount = appRequests.length;
  let stableSince = Date.now();
  while (Date.now() - startedAt < 1_200) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (appRequests.length !== previousCount) {
      previousCount = appRequests.length;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 350) return;
  }
}

async function waitForRequest(pathname) {
  await waitFor(() => requestSeen(pathname), { timeoutMs: 12_000, label: `request ${pathname}` });
}

function assertRequests() {
  const paths = requestPaths();
  for (const expected of expectedRequests) {
    if (!paths.includes(expected)) addError("browser runtime requests", `Expected request was not observed: ${expected}`);
  }

  for (const request of appRequests) {
    for (const forbidden of forbiddenRequestPatterns) {
      if (forbidden.pattern.test(request.path)) {
        addError("browser runtime requests", `Observed forbidden ${forbidden.label}: ${request.path}`);
      }
    }
  }

  for (const failure of failedRuntimeResponses) {
    addError("browser runtime requests", `Runtime request failed: ${failure.path} (${failure.status} ${failure.text ?? ""})`);
  }

  if (browserErrors.length) {
    for (const error of browserErrors) addError("browser runtime console", error);
  }
}

function assertRouteRequestBudget() {
  const uniqueHikingRouteRequests = new Set(hikingRouteRequestPaths());
  const maxHikingRouteRequests = 12;
  if (uniqueHikingRouteRequests.size > maxHikingRouteRequests) {
    addError(
      "browser route loading",
      `Observed ${uniqueHikingRouteRequests.size} unique hiking route GeoJSON requests; selected/context route loading should stay at or below ${maxHikingRouteRequests}.`
    );
  }
}

async function exerciseKayakFilters(client, expectations) {
  const detailRequestsBefore = kayakDetailRuntimeRequests();
  const filterTexts = await evaluate(
    client,
    `(() => {
      const normalize = (value) => value.replace(/\\s+/g, " ").trim().toLowerCase();
      const controls = [
        ...document.querySelectorAll(".kayak-sidebar-filters label, .kayak-sidebar-filters button, .kayak-sidebar-filters input, .kayak-sidebar-filters select")
      ];
      return controls.map((control) =>
        normalize([
          control.textContent ?? "",
          control.getAttribute("aria-label") ?? "",
          control.getAttribute("title") ?? "",
          control.getAttribute("placeholder") ?? ""
        ].join(" "))
      );
    })()`
  );

  if (filterTexts.some((label) => label.includes("follow"))) {
    addError("browser kayak filters", `Kayak follow-up signal should stay internal; visible filter controls: ${filterTexts.join(", ")}`);
  }

  await waitForSidebarRouteCount(client, expectations.total, expectations.total);
  await setSelectByLabel(client, "Exposure", "exposed", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.exposed, expectations.total);
  await setSelectByLabel(client, "Exposure", "all", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.total, expectations.total);
  await setSelectByLabel(client, "Water", "outer", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.outer, expectations.total);
  await setSelectByLabel(client, "Exposure", "exposed", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.outerExposed, expectations.total);
  await setSelectByLabel(client, "Water", "all", { containerSelector: ".kayak-sidebar-filters" });
  await setSelectByLabel(client, "Exposure", "all", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.total, expectations.total);
  await setSelectByLabel(client, "Confidence", "low", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.lowConfidence, expectations.total);
  await setSelectByLabel(client, "Confidence", "all", { containerSelector: ".kayak-sidebar-filters" });
  await waitForSidebarRouteCount(client, expectations.total, expectations.total);
  await settleBrowserRequests();

  const detailRequestsAfter = kayakDetailRuntimeRequests();
  const newDetailRequests = detailRequestsAfter.slice(detailRequestsBefore.length);
  if (newDetailRequests.length) {
    addError("browser kayak filters", `Filtering requested detail/route payloads: ${newDetailRequests.join(", ")}`);
  }
}

async function assertRouteBuilderUiPolish(client) {
  await waitFor(
    () => evaluate(client, `Boolean(document.querySelector(".leaflet-container"))`),
    { timeoutMs: 6_000, label: "Leaflet map container" }
  );

  const result = await evaluate(
    client,
    `(() => {
      const searchInputs = [...document.querySelectorAll(".search-field input")];
      const sectionRows = [...document.querySelectorAll(".section-row")];
      const contextRoutes = [...document.querySelectorAll(".context-route")];
      const map = document.querySelector(".leaflet-container");
      return {
        searchInputs: searchInputs.length,
        unlabeledSearchInputs: searchInputs.filter((input) => !input.getAttribute("aria-label")?.trim()).length,
        sectionRows: sectionRows.length,
        sectionRowsWithPressedState: sectionRows.filter((row) => row.hasAttribute("aria-pressed")).length,
        contextRoutes: contextRoutes.length,
        contextRoutesWithPressedState: contextRoutes.filter((button) => button.hasAttribute("aria-pressed")).length,
        hasMap: Boolean(map),
        mapTabIndex: map?.getAttribute("tabindex") ?? null
      };
    })()`
  );

  if (!result.searchInputs) addError("browser UI polish", "Search input was not found in the sidebar.");
  if (result.unlabeledSearchInputs) addError("browser UI polish", `${result.unlabeledSearchInputs} search input(s) are missing accessible names.`);
  if (!result.sectionRows) addError("browser UI polish", "Route builder section rows were not found.");
  if (result.sectionRowsWithPressedState !== result.sectionRows) {
    addError("browser UI polish", "Route builder section rows are missing aria-pressed state.");
  }
  if (result.contextRoutes && result.contextRoutesWithPressedState !== result.contextRoutes) {
    addError("browser UI polish", "Route option buttons are missing aria-pressed state.");
  }
  if (!result.contextRoutes) addError("browser UI polish", "Route option buttons were not rendered for the assertion route range.");
  if (!result.hasMap) addError("browser UI polish", "Leaflet map container was not found.");
  if (result.mapTabIndex === "0") {
    addError("browser UI polish", "Leaflet map container is keyboard-focusable even though keyboard map mode is disabled.");
  }
}

async function readHikingMapHelperState(client) {
  return evaluate(
    client,
    `(() => {
      const chips = [...document.querySelectorAll(".map-filter-chip")];
      const activeFacilityMarkers = [...document.querySelectorAll(".facility-marker")].length;
      const facilityClusterMarkers = [...document.querySelectorAll(".facility-cluster-marker")].length;
      const facilitySpiderMarkers = [...document.querySelectorAll(".facility-spider-marker")].length;
      const commuteMarkers = [...document.querySelectorAll(".commute-marker")].length;
      const commuteClusterMarkers = [...document.querySelectorAll(".commute-cluster-marker")].length;
      const commuteSpiderMarkers = [...document.querySelectorAll(".commute-spider-marker")].length;
      const facilityMarkerPosition = getComputedStyle(document.querySelector(".facility-marker")).position;
      const chip = chips.find((candidate) => candidate.getAttribute("aria-label")?.includes("Tent sites"));
      const chipTypes = (chip?.dataset.facilityTypes ?? "").split(/\\s+/).filter(Boolean);
      const toggledTypeSelector = chipTypes
        .flatMap((type) => [".facility-marker-" + CSS.escape(type), ".facility-cluster-has-" + CSS.escape(type)])
        .join(", ");
      const activeToggledTypeMarkers = toggledTypeSelector ? [...document.querySelectorAll(toggledTypeSelector)].length : 0;
      return {
        activeFacilityMarkers,
        activeToggledTypeMarkers,
        facilityClusterMarkers,
        facilitySpiderMarkers,
        commuteMarkers,
        commuteClusterMarkers,
        commuteSpiderMarkers,
        facilityMarkerPosition,
        chipCount: chips.length,
        chipTypes,
        pressed: chip?.getAttribute("aria-pressed") ?? null,
        chipLabel: chip?.getAttribute("aria-label") ?? "",
        chipTitle: chip?.getAttribute("title") ?? ""
      };
    })()`
  );
}

async function waitForStableHikingMapHelperState(client, { campingPressed, label }) {
  let previousSignature = "";
  let stableReads = 0;
  return waitFor(
    async () => {
      const state = await readHikingMapHelperState(client);
      if (!state.activeFacilityMarkers || !state.commuteMarkers || state.pressed !== campingPressed) {
        previousSignature = "";
        stableReads = 0;
        return false;
      }

      const signature = [
        state.activeFacilityMarkers,
        state.activeToggledTypeMarkers,
        state.facilityClusterMarkers,
        state.facilitySpiderMarkers,
        state.commuteMarkers,
        state.commuteClusterMarkers,
        state.commuteSpiderMarkers,
        state.facilityMarkerPosition,
        state.chipCount,
        state.chipTypes.join(","),
        state.pressed,
        state.chipLabel,
        state.chipTitle
      ].join("|");
      if (signature === previousSignature) {
        stableReads += 1;
      } else {
        previousSignature = signature;
        stableReads = 0;
      }

      return stableReads >= 2 ? state : false;
    },
    { timeoutMs: 8_000, intervalMs: 150, label }
  );
}

async function assertHikingMapHelpers(client) {
  await waitFor(
    () =>
      evaluate(
        client,
        `document.querySelectorAll(".facility-marker").length > 0 && document.querySelectorAll(".commute-marker").length > 0`
    ),
    { timeoutMs: 8_000, label: "hiking map facility and commute markers" }
  );
  await settleBrowserRequests();

  const before = await waitForStableHikingMapHelperState(client, {
    campingPressed: "true",
    label: "stable hiking facility markers before toggling Tent sites"
  });

  if (!before.activeFacilityMarkers) addError("browser hiking map helpers", "Facility markers were not rendered on the trail-system map.");
  if (!before.facilityClusterMarkers) addError("browser hiking map helpers", "Overlapping facility cluster markers were not rendered.");
  if (!before.commuteMarkers) addError("browser hiking map helpers", "Commute markers were not rendered on the trail-system map.");
  if (!before.commuteClusterMarkers) addError("browser hiking map helpers", "Overlapping commute cluster markers were not rendered.");
  if (before.facilityMarkerPosition !== "absolute") {
    addError("browser hiking map helpers", `Facility markers must keep Leaflet absolute positioning, got "${before.facilityMarkerPosition}".`);
  }
  if (!before.chipCount) addError("browser hiking map helpers", "Facility map filter chips were not rendered.");
  if (!before.chipLabel.includes("Tent sites") || !before.chipTitle.includes("Tent sites")) {
    addError("browser hiking map helpers", `Tent sites facility filter label/title was not rendered correctly: ${before.chipLabel} / ${before.chipTitle}`);
  }
  if (!before.chipTypes.length) {
    addError("browser hiking map helpers", "Tent sites facility filter does not expose its facility types for deterministic checks.");
  }
  if (!before.activeToggledTypeMarkers) {
    addError("browser hiking map helpers", `Tent sites facility filter had no visible markers or clusters for types "${before.chipTypes.join(", ")}".`);
  }
  if (before.pressed !== "true") {
    addError("browser hiking map helpers", `Tent sites facility filter should start pressed, got ${before.pressed}.`);
  }

  const expandedCluster = await evaluate(
    client,
    `(() => {
      const cluster = document.querySelector(".facility-cluster-marker:not(.poi-cluster-origin-dot)");
      if (!cluster) return { ok: false };
      const mapPane = cluster.closest(".leaflet-container")?.querySelector(".leaflet-map-pane");
      const beforeTransform = mapPane?.style.transform || (mapPane ? getComputedStyle(mapPane).transform : "");
      cluster.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return { ok: true, beforeTransform };
    })()`
  );
  if (!expandedCluster.ok) {
    addError("browser hiking map helpers", "Could not find an overlapping facility cluster marker to expand.");
  } else {
    const expandedState = await waitFor(
      () =>
        evaluate(
          client,
          `(() => {
            const spiderMarkers = document.querySelectorAll(".facility-spider-marker, .commute-spider-marker").length;
            const originDots = document.querySelectorAll(".poi-cluster-origin-dot").length;
            const openPopups = document.querySelectorAll(".leaflet-popup").length;
            const mapPane = document.querySelector(".leaflet-map-pane");
            const mapTransform = mapPane?.style.transform || (mapPane ? getComputedStyle(mapPane).transform : "");
            return spiderMarkers > 1 && originDots > 0 && openPopups === 0 ? { mapTransform } : false;
          })()`
        ),
      { timeoutMs: 4_000, label: "facility cluster expansion" }
    );
    if (expandedCluster.beforeTransform !== expandedState.mapTransform) {
      addError("browser hiking map helpers", "Expanding a facility cluster panned the Leaflet map pane.");
    }
  }

  const collapsedCluster = await evaluate(
    client,
    `(() => {
      const originDot = document.querySelector(".poi-cluster-origin-dot");
      if (!originDot) return { ok: false };
      originDot.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return { ok: true };
    })()`
  );
  if (!collapsedCluster.ok) {
    addError("browser hiking map helpers", "Expanded cluster did not leave a clickable origin dot for collapse.");
  } else {
    await waitFor(
      () =>
        evaluate(
          client,
          `document.querySelectorAll(".facility-spider-marker, .commute-spider-marker").length === 0 && document.querySelectorAll(".poi-cluster-origin-dot").length === 0`
        ),
      { timeoutMs: 4_000, label: "cluster recollapse" }
    );
  }

  const expandedCommuteCluster = await evaluate(
    client,
    `(() => {
      const cluster = document.querySelector(".commute-cluster-marker:not(.poi-cluster-origin-dot)");
      if (!cluster) return { ok: false };
      const mapPane = cluster.closest(".leaflet-container")?.querySelector(".leaflet-map-pane");
      const beforeTransform = mapPane?.style.transform || (mapPane ? getComputedStyle(mapPane).transform : "");
      cluster.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return { ok: true, beforeTransform };
    })()`
  );
  if (!expandedCommuteCluster.ok) {
    addError("browser hiking map helpers", "Could not find an overlapping commute cluster marker to expand.");
  } else {
    const expandedCommuteState = await waitFor(
      () =>
        evaluate(
          client,
          `(() => {
            const commuteSpiders = document.querySelectorAll(".commute-spider-marker").length;
            const allSpiders = document.querySelectorAll(".facility-spider-marker, .commute-spider-marker").length;
            const originDots = document.querySelectorAll(".poi-cluster-origin-dot").length;
            const openPopups = document.querySelectorAll(".leaflet-popup").length;
            const mapPane = document.querySelector(".leaflet-map-pane");
            const mapTransform = mapPane?.style.transform || (mapPane ? getComputedStyle(mapPane).transform : "");
            return commuteSpiders > 0 && allSpiders > 1 && originDots > 0 && openPopups === 0 ? { mapTransform } : false;
          })()`
        ),
      { timeoutMs: 4_000, label: "commute cluster expansion" }
    );
    if (expandedCommuteCluster.beforeTransform !== expandedCommuteState.mapTransform) {
      addError("browser hiking map helpers", "Expanding a commute cluster panned the Leaflet map pane.");
    }
  }

  const toggle = await evaluate(
    client,
    `(() => {
      const chip = [...document.querySelectorAll(".map-filter-chip")].find((candidate) => candidate.getAttribute("aria-label")?.includes("Tent sites"));
      if (!chip) return { ok: false };
      chip.click();
      return { ok: true };
    })()`
  );

  if (!toggle.ok) {
    addError("browser hiking map helpers", "Could not toggle the Tent sites facility map filter chip.");
    return;
  }

  await waitFor(
    () =>
      evaluate(
        client,
        `(() => {
          const chip = [...document.querySelectorAll(".map-filter-chip")].find((candidate) => candidate.getAttribute("aria-label")?.includes("Tent sites"));
          return chip?.getAttribute("aria-pressed") === "false";
        })()`
    ),
    { timeoutMs: 6_000, label: "Tent sites facility filter toggle" }
  );
  await settleBrowserRequests();

  const after = await waitForStableHikingMapHelperState(client, {
    campingPressed: "false",
    label: "stable hiking facility markers after toggling Tent sites"
  });

  if (after.pressed !== "false") {
    addError("browser hiking map helpers", `Tent sites facility filter did not toggle aria-pressed to false, got ${after.pressed}.`);
  }
  if (!after.chipTitle.includes("Show Tent sites")) {
    addError("browser hiking map helpers", `Tent sites facility filter title did not update after toggle: ${after.chipTitle}`);
  }
  if (after.activeToggledTypeMarkers >= before.activeToggledTypeMarkers) {
    addError(
      "browser hiking map helpers",
      `Tent sites marker visibility did not decrease after disabling ${before.chipTypes.join(", ")} (${before.activeToggledTypeMarkers} -> ${after.activeToggledTypeMarkers}).`
    );
  }
  if (after.commuteMarkers !== before.commuteMarkers) {
    addError("browser hiking map helpers", "Commute marker count changed when toggling a facility filter.");
  }
}

async function assertPrintPolish(client) {
  try {
    await client.send("Emulation.setEmulatedMedia", { media: "print" });
    const result = await evaluate(
      client,
      `(() => {
        const sectionList = document.querySelector(".section-list");
        const mapWithControls = document.querySelector(".map-with-controls");
        const sectionListStyle = sectionList ? getComputedStyle(sectionList) : null;
        const mapStyle = mapWithControls ? getComputedStyle(mapWithControls) : null;
        return {
          hasSectionList: Boolean(sectionList),
          sectionListOverflowY: sectionListStyle?.overflowY ?? null,
          sectionListMaxHeight: sectionListStyle?.maxHeight ?? null,
          mapWithControlsDisplay: mapStyle?.display ?? null
        };
      })()`
    );

    if (!result.hasSectionList) addError("browser print polish", "Route builder section list was not found for print checks.");
    if (result.sectionListOverflowY !== "visible") {
      addError("browser print polish", `Print section list overflow-y should be visible, got ${result.sectionListOverflowY}.`);
    }
    if (result.sectionListMaxHeight !== "none") {
      addError("browser print polish", `Print section list max-height should be none, got ${result.sectionListMaxHeight}.`);
    }
    if (result.mapWithControlsDisplay !== "none") {
      addError("browser print polish", `Print map controls should be hidden, got display ${result.mapWithControlsDisplay}.`);
    }
  } finally {
    await client.send("Emulation.setEmulatedMedia", { media: "screen" }).catch(() => {});
  }
}

async function assertInfoPrintPolish(client) {
  await waitFor(
    () =>
      evaluate(
        client,
        `document.querySelectorAll(".facility-panel").length > 0 && document.querySelectorAll(".transit-panel").length > 0`
      ),
    { timeoutMs: 8_000, label: "mounted facility and transit accordion panels" }
  );

  try {
    await client.send("Emulation.setEmulatedMedia", { media: "print" });
    const result = await evaluate(
      client,
      `(() => {
        const facilityPanels = [...document.querySelectorAll(".facility-panel.collapsed")];
        const transitPanels = [...document.querySelectorAll(".transit-panel.collapsed")];
        return {
          collapsedFacilityPanels: facilityPanels.length,
          collapsedFacilityPanelsPrinted: facilityPanels.filter((panel) => getComputedStyle(panel).display !== "none").length,
          collapsedTransitPanels: transitPanels.length,
          collapsedTransitPanelsPrinted: transitPanels.filter((panel) => getComputedStyle(panel).display !== "none").length
        };
      })()`
    );

    if (!result.collapsedFacilityPanels) addError("browser print polish", "Closed facility accordion panels were not mounted for print.");
    if (result.collapsedFacilityPanelsPrinted !== result.collapsedFacilityPanels) {
      addError("browser print polish", "Closed facility accordion panels are still hidden in print.");
    }
    if (!result.collapsedTransitPanels) addError("browser print polish", "Closed transit accordion panel was not mounted for print.");
    if (result.collapsedTransitPanelsPrinted !== result.collapsedTransitPanels) {
      addError("browser print polish", "Closed transit accordion panel is still hidden in print.");
    }
  } finally {
    await client.send("Emulation.setEmulatedMedia", { media: "screen" }).catch(() => {});
  }
}

async function assertOverviewRouteColorVariety(client, { scope, minimumUniqueColors }) {
  await waitFor(
    () =>
      evaluate(
        client,
        `document.querySelector(".overview-route-map svg") && document.querySelectorAll(".overview-route-map .leaflet-interactive").length > 0`
      ),
    { timeoutMs: 8_000, label: `${scope} mounted route layers` }
  );

  const stats = await evaluate(
    client,
    `(() => {
      const numberOr = (value, fallback) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };
      const normalizeColor = (value) => value.trim().toLowerCase().replace(/\\s+/g, "");
      const elements = [
        ...document.querySelectorAll(".overview-route-map path.leaflet-interactive, .overview-route-map circle.leaflet-interactive")
      ];
      const visibleRouteLayers = elements.filter((element) => {
        const styles = getComputedStyle(element);
        const stroke = normalizeColor(element.getAttribute("stroke") || styles.stroke || "");
        const opacity = numberOr(element.getAttribute("opacity") || styles.opacity, 1);
        const strokeOpacity = numberOr(element.getAttribute("stroke-opacity") || styles.getPropertyValue("stroke-opacity"), 1);
        return stroke && stroke !== "none" && stroke !== "#000000" && stroke !== "rgb(0,0,0)" && opacity > 0.1 && strokeOpacity > 0.1;
      });
      const colors = visibleRouteLayers.map((element) =>
        normalizeColor(element.getAttribute("stroke") || getComputedStyle(element).stroke || "")
      );
      return {
        routeLayerCount: visibleRouteLayers.length,
        uniqueColors: [...new Set(colors)]
      };
    })()`
  );

  if ((stats?.uniqueColors?.length ?? 0) < minimumUniqueColors) {
    addError(
      scope,
      `Expected at least ${minimumUniqueColors} visible overview route colors, got ${stats?.uniqueColors?.length ?? 0} across ${
        stats?.routeLayerCount ?? 0
      } visible route layers.`
    );
  }
}

async function exerciseApp(client, origin) {
  await client.send("Network.enable");
  await client.send("Runtime.enable");
  await client.send("Page.enable");
  installNetworkObservers(client, origin);

  await client.send("Page.navigate", { url: `${origin}/` });
  await waitForText(client, "Hiking Routes");
  await waitForRequest("/data/library-index.json");
  await waitForRequest("/data/overviews/hiking.geojson");
  await assertOverviewRouteColorVariety(client, { scope: "hiking overview colors", minimumUniqueColors: 2 });

  await clickButton(client, "Roslagsleden");
  await waitForRequest("/data/trail-systems/roslagsleden/manifest.json");
  await waitForRequest("/data/trail-systems/roslagsleden/sections-index.json");
  await waitForRequest("/data/trail-systems/roslagsleden/route-groups.json");
  await waitForRequest("/data/trail-systems/roslagsleden/presets.json");
  await waitForRequest("/data/trail-systems/roslagsleden/sections/roslagsleden-stage-1.json");
  await waitForText(client, "Back to overview");
  await clickButton(client, "Back to overview");
  await waitForText(client, "Hiking Routes");

  await clickButton(client, "Sörmlandsleden");
  await waitForRequest("/data/trail-systems/sormlandsleden/manifest.json");
  await waitForRequest("/data/trail-systems/sormlandsleden/sections-index.json");
  await waitForRequest("/data/trail-systems/sormlandsleden/route-groups.json");
  await waitForRequest("/data/trail-systems/sormlandsleden/presets.json");
  await waitForRequest("/data/trail-systems/sormlandsleden/sections/sormlandsleden-stage-1.json");
  await waitForText(client, "Back to overview");
  await setSelectByLabel(client, "Start", "sormlandsleden-stage-1", { containerSelector: ".trail-builder" });
  await setSelectByLabel(client, "End", "sormlandsleden-stage-6", { containerSelector: ".trail-builder" });
  await waitFor(() => evaluate(client, `document.querySelectorAll(".context-route").length > 0`), {
    timeoutMs: 6_000,
    label: "Sörmlandsleden context route buttons"
  });
  await clickFirstContextRoute(client);
  await assertRouteBuilderUiPolish(client);
  await assertHikingMapHelpers(client);
  await assertPrintPolish(client);
  await clickButton(client, "Select route and view info");
  await waitForText(client, "Facilities");
  await assertInfoPrintPolish(client);
  await clickButton(client, "Back to overview");
  await waitForText(client, "Hiking Routes");
}

async function main() {
  const chromePath = await findChromeExecutable();
  if (!chromePath) {
    addError("browser executable", "Could not find Chrome/Chromium. Set CHROME_BIN or BROWSER_BIN to run the browser runtime probe.");
  }

  let vite;
  let browser;
  let client;
  try {
    if (chromePath) {
      vite = await startVite();
      browser = await launchBrowser(chromePath);
      client = await createPage(browser.debugPort);
      await exerciseApp(client, vite.origin);
      assertRequests();
      assertRouteRequestBudget();
    }
  } catch (error) {
    addError("browser runtime probe", error.message);
  } finally {
    const cleanupErrors = [];
    try {
      client?.close();
    } catch (error) {
      cleanupErrors.push(`CDP close failed: ${error.message}`);
    }
    try {
      await stopBrowser(browser);
    } catch (error) {
      cleanupErrors.push(`browser cleanup failed: ${error.message}`);
    }
    try {
      if (vite?.server) await vite.server.close();
    } catch (error) {
      cleanupErrors.push(`Vite cleanup failed: ${error.message}`);
    }
    if (cleanupErrors.length) addError("browser runtime cleanup", cleanupErrors.join("; "));
  }

  if (errors.length) {
    console.error("Browser runtime probe failed:");
    for (const error of errors) console.error(`- ${error.scope}: ${error.message}`);
    process.exit(1);
  }

  console.log("Browser runtime probe passed.");
  console.log(`- local runtime requests observed: ${new Set(requestPaths()).size} unique paths, ${appRequests.length} total requests`);
  console.log("- trail-system selections used shard JSON and did not request legacy all-in-one trail-system JSON");
  console.log("- overview maps expose a broad visible route-color scale");
  console.log("- trail-system maps stayed within the selected/context route request budget");
  console.log("- route builder accessibility and print overflow checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
