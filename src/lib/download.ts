export const getFileNameFromUrl = (url: string, fallback = "download"): string => {
  try {
    const withoutQuery = url.split("?")[0].split("#")[0];
    const segment = withoutQuery.split("/").filter(Boolean).pop();
    if (segment && segment.includes(".")) {
      return decodeURIComponent(segment);
    }
  } catch {}
  return fallback;
};

export const downloadFromUrl = async (url: string, fileName?: string): Promise<boolean> => {
  const name = fileName || getFileNameFromUrl(url);
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return false;
  }
};
