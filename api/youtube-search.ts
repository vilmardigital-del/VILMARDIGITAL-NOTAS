interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
}

interface YoutubeVideoResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  url: string;
}

const extractVideosFromContents = (contents: any[]): YoutubeVideoResult[] => {
  const videos: YoutubeVideoResult[] = [];
  const seenIds = new Set<string>();

  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v || !v.videoId || seenIds.has(v.videoId)) continue;
      seenIds.add(v.videoId);

      const title =
        v.title?.runs?.map((r: any) => r.text).join('') || 'Salmo no YouTube';
      const channel =
        v.ownerText?.runs?.[0]?.text ||
        v.longBylineText?.runs?.[0]?.text ||
        'YouTube';
      const duration = v.lengthText?.simpleText || '';
      const views =
        v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || '';
      const thumbnail =
        v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
        `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;

      videos.push({
        id: v.videoId,
        title,
        channel,
        duration,
        views,
        thumbnail,
        url: `https://www.youtube.com/watch?v=${v.videoId}`
      });

      if (videos.length >= 12) break;
    }
    if (videos.length >= 12) break;
  }

  return videos;
};

const fetchWithSafeRedirects = async (
  startUrl: string,
  baseHeaders: Record<string, string>,
  maxRedirects = 4
) => {
  let currentUrl = startUrl;
  let cookieJar = baseHeaders['Cookie'] || '';

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        ...baseHeaders,
        ...(cookieJar ? { Cookie: cookieJar } : {})
      }
    });

    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const newCookies = setCookieHeader
        .split(/,(?=\s*[^;]+=)/)
        .map((c) => c.split(';')[0].trim())
        .filter(Boolean);
      if (newCookies.length > 0) {
        cookieJar = cookieJar
          ? `${cookieJar}; ${newCookies.join('; ')}`
          : newCookies.join('; ');
      }
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`YouTube redirecionou sem destino (${response.status})`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error('Limite de redirecionamentos atingido ao acessar o YouTube.');
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader?.('Cache-Control', 'no-store');

  try {
    const rawQ = req.query?.q;
    const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ || '').trim();

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Digite algo para localizar no YouTube.'
      });
    }

    const trimmedQuery = q.slice(0, 200);
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    try {
      const innertubeRes = await fetch(
        'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
        {
          method: 'POST',
          redirect: 'manual',
          signal: AbortSignal.timeout(8000),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20241120.01.00',
                hl: 'pt',
                gl: 'BR'
              }
            },
            query: trimmedQuery
          })
        }
      );

      if (innertubeRes.ok) {
        const data: any = await innertubeRes.json();
        const contents =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents || [];
        const videos = extractVideosFromContents(contents);
        if (videos.length > 0) {
          return res.status(200).json({ success: true, videos });
        }
      }
    } catch (innertubeError) {
      console.warn('Innertube fallback para HTML:', innertubeError);
    }

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmedQuery)}`;
    const response = await fetchWithSafeRedirects(searchUrl, {
      'User-Agent': userAgent,
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Cookie:
        'CONSENT=YES+cb.20210328-17-p0.pt-BR+FX+999; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg'
    });

    if (!response.ok) {
      throw new Error(`YouTube respondeu com status ${response.status}`);
    }

    const html = await response.text();
    const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!match) {
      return res.status(200).json({ success: true, videos: [] });
    }

    const data = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];
    const videos = extractVideosFromContents(contents);

    return res.status(200).json({ success: true, videos });
  } catch (error: any) {
    console.error('Erro na busca do YouTube:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Não foi possível localizar vídeos no YouTube.'
    });
  }
}
