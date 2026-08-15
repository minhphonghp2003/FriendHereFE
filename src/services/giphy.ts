import { httpClient } from "@/lib/axios";

export interface GiphyItem {
  id: string;
  url: string;
  thumbUrl: string;
}

// GET {API}/chat/giphy?q=<query>&type=gif|sticker
// Response shape (FE-declared): { success: boolean; data: GiphyItem[] }
export async function searchGiphy(query: string, type: "gif" | "sticker"): Promise<GiphyItem[]> {
  const res = await httpClient.get<{ success: boolean; data: GiphyItem[] }>("/chat/giphy", {
    params: { q: query.trim() || undefined, type },
  });
  return res.data?.data ?? [];
}
