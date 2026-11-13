import { createHash } from 'node:crypto';
import { cp, readdir, readFile, rm } from 'node:fs/promises';

// A versioned directory also invalidates relative imports and dynamically loaded CSS.
export async function versionedAssetDirectory(source, destination, prefix = 'taste') {
  const hash = createHash('sha256');
  async function visit(dir, relative = '') {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = relative + entry.name;
      const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) await visit(path, name + '/');
      else { hash.update(name + '\0'); hash.update(await readFile(path)); }
    }
  }
  await visit(source);
  const name = `${prefix}-${hash.digest('hex').slice(0, 12)}`;
  // Only generated copies under .legacy-public are removed, never source assets.
  for (const entry of await readdir(destination)) {
    if (new RegExp(`^${prefix}-[a-f0-9]{12}$`).test(entry) && entry !== name) {
      await rm(new URL(entry + '/', destination), { recursive: true, force: true });
    }
  }
  // The source tree is copied by the legacy public-asset step before this
  // helper runs. Remove that unversioned alias so old module URLs cannot be
  // served from the same published directory.
  await rm(new URL(prefix + '/', destination), { recursive: true, force: true });
  await cp(source, new URL(name + '/', destination), { recursive: true });
  return name;
}
