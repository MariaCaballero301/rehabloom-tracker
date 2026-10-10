/** A live update can leave the old renderer running against a newly optimized React module. */
export function hasMixedReactVersions(resources: string[]) {
  const versions = new Set<string>();
  for (const resource of resources) {
    const url = new URL(resource, "http://localhost");
    if (/\/node_modules\/\.vite\/deps\/react(?:-dom_client|-dom)?\.js$/.test(url.pathname)) {
      const version = url.searchParams.get("v");
      if (version) versions.add(version);
    }
  }
  return versions.size > 1;
}