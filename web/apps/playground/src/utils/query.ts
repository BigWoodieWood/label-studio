export function getQueryParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export function getInterfacesFromParams(params: URLSearchParams): string[] {
  const interfacesParam = params.get("interfaces");
  if (!interfacesParam) return ["side-column"];
  return interfacesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
