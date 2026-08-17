import { readFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, "data.json");

const EMPTY_DATA = {
  weddingDate: null,
  sections: [],
  events: [],
  guestOwners: [],
  inspirationItems: [],
  inspirationCategories: [],
  budget: { total: 0 },
  budgetItems: [],
  budgetCategories: [],
  vendors: [],
  exchangeRate: { myrToSgd: 0.3128, updatedAt: null, source: "default" },
  todos: [],
};

let writeChain = Promise.resolve();

export async function readData() {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      await mkdir(DATA_DIR, { recursive: true });
      await writeData(EMPTY_DATA);
      return EMPTY_DATA;
    }
    throw err;
  }
}

export function writeData(data) {
  writeChain = writeChain.then(() =>
    writeFile(DATA_FILE, JSON.stringify(data, null, 2))
  );
  return writeChain;
}
