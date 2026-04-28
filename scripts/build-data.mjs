import { readFile } from "node:fs/promises";
import path from "node:path";
import { importKayakData } from "./import-kayak-data.mjs";
import { readHikingSourceData } from "./lib/hiking-source-shards.mjs";
import { composeLibraryIndex } from "./lib/library-index-fragments.mjs";
import { writeHikeData } from "./write-hike-data.mjs";

const projectRoot = process.cwd();
const hikesPath = path.join(projectRoot, "data", "hikes.json");

const hikes = JSON.parse(await readFile(hikesPath, "utf8"));
const trailSystems = await readHikingSourceData({ projectRoot });

await writeHikeData(hikes, trailSystems, { composeIndex: false });
await importKayakData({ projectRoot, composeIndex: false });
await composeLibraryIndex({ projectRoot });
