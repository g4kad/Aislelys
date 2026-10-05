import { readFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, "data.json");

const EMPTY_DATA = {
  couples: [],
  sections: [],
  events: [],
  guestOwners: [],
  inspirationItems: [],
  inspirationCategories: [],
  budgetItems: [],
  budgetCategories: [],
  vendors: [],
  vendorCategories: [],
  exchangeRate: {
    base: "SGD",
    rates: { SGD: 1, MYR: 0.3128, THB: 0.0375, PHP: 0.0237, USD: 1.34, EUR: 1.45, GBP: 1.7, JPY: 0.0089, CNY: 0.186, KRW: 0.00097 },
    updatedAt: null,
    source: "default",
  },
  todos: [],
  users: [],
  sessions: [],
  notifications: [],
};

let writeChain = Promise.resolve();

// Cached in memory after the first load so concurrent requests (e.g. two
// creates fired back-to-back from one UI action) mutate the same object
// instead of each reading a stale disk snapshot and clobbering the other's
// write when they save. Safe because this is a single local dev process.
let cache = null;

export async function readData() {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    cache = JSON.parse(raw);
    return cache;
  } catch (err) {
    if (err.code === "ENOENT") {
      await mkdir(DATA_DIR, { recursive: true });
      cache = EMPTY_DATA;
      await writeData(cache);
      return cache;
    }
    throw err;
  }
}

export function writeData(data) {
  cache = data;
  writeChain = writeChain.then(() =>
    writeFile(DATA_FILE, JSON.stringify(data, null, 2))
  );
  return writeChain;
}
