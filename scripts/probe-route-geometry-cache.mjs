import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(path.join(scriptDir, ".."));
const errors = [];

function addError(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) addError(message);
}

async function main() {
  const originalFetch = globalThis.fetch;
  let failedPaths = new Set();
  globalThis.fetch = async (requestPath) => {
    const pathString = String(requestPath);
    if (failedPaths.has(pathString)) {
      return {
        ok: false,
        json: async () => ({})
      };
    }
    return {
      ok: true,
      json: async () => ({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { path: pathString },
            geometry: {
              type: "LineString",
              coordinates: [
                [18, 59],
                [18.01, 59.01]
              ]
            }
          }
        ]
      })
    };
  };

  const vite = await createViteServer({
    root: projectRoot,
    logLevel: "error",
    server: {
      middlewareMode: true
    },
    appType: "custom"
  });

  try {
    const {
      clearRouteGeometryCache,
      getRouteGeometryCacheDiagnostics,
      loadRouteGeometry,
      maxRouteGeometryCacheEntries
    } = await vite.ssrLoadModule("/src/map/routeGeometry.ts");

    clearRouteGeometryCache();
    for (let index = 0; index < maxRouteGeometryCacheEntries + 5; index += 1) {
      await loadRouteGeometry(`/routes/cache-probe-${index}.geojson`);
    }

    let diagnostics = getRouteGeometryCacheDiagnostics();
    assert(diagnostics.size === maxRouteGeometryCacheEntries, `expected cache size ${maxRouteGeometryCacheEntries}, got ${diagnostics.size}`);
    for (let index = 0; index < 5; index += 1) {
      assert(!diagnostics.paths.includes(`/routes/cache-probe-${index}.geojson`), `old route ${index} was not evicted`);
    }
    assert(
      diagnostics.paths.includes(`/routes/cache-probe-${maxRouteGeometryCacheEntries + 4}.geojson`),
      "newest route was not retained"
    );

    await loadRouteGeometry("/routes/cache-probe-5.geojson");
    await loadRouteGeometry("/routes/cache-probe-new.geojson");
    diagnostics = getRouteGeometryCacheDiagnostics();
    assert(diagnostics.paths.includes("/routes/cache-probe-5.geojson"), "cache hit did not refresh route recency");
    assert(!diagnostics.paths.includes("/routes/cache-probe-6.geojson"), "least-recent route was not evicted after recency refresh");

    failedPaths = new Set(["/routes/cache-probe-fail.geojson"]);
    await loadRouteGeometry("/routes/cache-probe-fail.geojson").catch(() => null);
    diagnostics = getRouteGeometryCacheDiagnostics();
    assert(!diagnostics.paths.includes("/routes/cache-probe-fail.geojson"), "failed route request stayed cached");
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }

  if (errors.length) {
    console.error("Route geometry cache probe failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("Route geometry cache probe passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
