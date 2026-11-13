import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getSantoDoDia, getReflexaoEspiritual } from "./src/santos_db";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request bodies
  app.use(express.json());

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route - Tempo Litúrgico e Santo do Dia (Sem uso do Gemini)
  app.get("/api/liturgia", async (req, res) => {
    try {
      const { date } = req.query; // formato YYYY-MM-DD
      let targetDateStr = "";
      if (typeof date === "string" && date) {
        targetDateStr = date;
      } else {
        // Obter data no fuso de Brasília
        const today = new Date();
        const offset = -3; // UTC-3 para Brasília
        const localDate = new Date(today.getTime() + offset * 3600 * 1000);
        targetDateStr = localDate.toISOString().split("T")[0];
      }

      const [yearStr, monthStr, dayStr] = targetDateStr.split("-");
      const yearVal = parseInt(yearStr, 10);
      const monthVal = parseInt(monthStr, 10);
      const dayVal = parseInt(dayStr, 10);

      const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const monthIndex = monthVal - 1;
      const readableDate = `${dayVal} de ${months[monthIndex]} de ${yearVal}`;

      let dataObj: any;
      let sources: Array<{ title: string; url: string }> = [
        { title: "API Liturgia Diária Diária", url: "https://liturgia.up.railway.app/" }
      ];

      try {
        // Buscar da API pública liturgia-diaria-api sem usar IA
        const apiUrl = `https://liturgia.up.railway.app/?dia=${dayVal}&mes=${monthVal}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        const apiData = await response.json();

        // Deduzir o Tempo Litúrgico com base na comemoração ou data
        let tempoLiturgico = "Tempo Comum";
        const liturgiaText = (apiData.liturgia || "").toLowerCase();
        if (liturgiaText.includes("páscoa") || liturgiaText.includes("pascoal")) {
          tempoLiturgico = "Tempo Pascal";
        } else if (liturgiaText.includes("quaresma") || liturgiaText.includes("cinzas")) {
          tempoLiturgico = "Tempo da Quaresma";
        } else if (liturgiaText.includes("advento")) {
          tempoLiturgico = "Tempo do Advento";
        } else if (liturgiaText.includes("natal")) {
          tempoLiturgico = "Tempo do Natal";
        }

        // Cor litúrgica
        let corLiturgica = apiData.cor || "Verde";
        // Normalizar primeira letra maiúscula
        if (corLiturgica) {
          corLiturgica = corLiturgica.charAt(0).toUpperCase() + corLiturgica.slice(1).toLowerCase();
        }

        // Construir listagem de leituras
        const leituras: string[] = [];
        if (apiData.primeiraleitura?.referencia) {
          leituras.push(`Primeira Leitura: ${apiData.primeiraleitura.referencia}`);
        }
        if (apiData.segundaleitura?.referencia) {
          leituras.push(`Segunda Leitura: ${apiData.segundaleitura.referencia}`);
        }
        if (apiData.salmo?.referencia) {
          leituras.push(`Salmo Responsorial: ${apiData.salmo.referencia}`);
        }
        if (apiData.evangelho?.referencia) {
          leituras.push(`Evangelho: ${apiData.evangelho.referencia}`);
        }

        // Obter informações estáticas polidas do Santo do Dia com base no calendário de 366 dias
        const santoInfo = getSantoDoDia(monthVal, dayVal);

        // Gerar reflexão pastoral contextualizada de alta qualidade
        const celebracao = apiData.liturgia || santoInfo.santo || "Celebração do dia";
        const reflexao = getReflexaoEspiritual(tempoLiturgico, celebracao, targetDateStr);

        dataObj = {
          tempoLiturgico,
          corLiturgica,
          celebracao,
          santoDoDia: santoInfo.biografia,
          santoDoDiaResumo: santoInfo.resumo,
          leituras,
          evangelhoTitulo: apiData.evangelho?.referencia || "Evangelho do Dia",
          evangelhoTexto: apiData.evangelho?.texto || "Proclamação indisponível.",
          reflexao,
          oracao: santoInfo.oracao
        };
      } catch (innerError) {
        console.warn("Falha no fetch da API litúrgica, aplicando fallback:", innerError);
        // Fallback robusto offline
        const santoInfo = getSantoDoDia(monthVal, dayVal);
        let tempoLiturgico = "Tempo Comum";
         if (monthVal === 12 && dayVal >= 17 && dayVal <= 24) {
          tempoLiturgico = "Tempo do Advento";
        } else if (monthVal === 12 && dayVal >= 25) {
          tempoLiturgico = "Tempo do Natal";
        } else if (monthVal === 1 && dayVal <= 6) {
          tempoLiturgico = "Tempo do Natal";
        }
        const celebracao = santoInfo.santo || "Celebração Diária";
        const reflexao = getReflexaoEspiritual(tempoLiturgico, celebracao, targetDateStr);

        dataObj = {
          tempoLiturgico,
          corLiturgica: (tempoLiturgico === "Tempo Comum" ? "Verde" : (tempoLiturgico === "Tempo do Advento" ? "Roxo" : "Branco")),
          celebracao,
          santoDoDia: santoInfo.biografia,
          santoDoDiaResumo: santoInfo.resumo,
          leituras: [
            "Primeira Leitura: Provérbios 3,1-6",
            "Salmo Responsorial: Sl 118",
            "Evangelho: Mateus 11,25-30"
          ],
          evangelhoTitulo: "Mateus 11,25-30",
          evangelhoTexto: "Naquele tempo, Jesus tomou a palavra e disse: 'Eu te louvo, Pai, Senhor do céu e da terra, porque escondeste estas coisas aos sábios e inteligentes, e as revelaste aos pequeninos. Sim, Pai, porque assim foi do vosso agrado. Tudo me foi entregue por meu Pai, e ninguém conhece o Filho senão o Pai, e ninguém conhece o Pai senão o Filho e aquele a quem o Filho o quiser revelar. Vinde a mim, todos vós que estais cansados e fatigados sob o peso dos vossos fardos, e eu vos darei descanso. Tomai sobre vós o meu jugo e aprendei de mim, porque sou manso e humilde de coração, e vós encontrareis descanso para as vossas almas. Pois o meu jugo é suave e o meu fardo é leve'.",
          reflexao,
          oracao: santoInfo.oracao
        };
        sources = [{ title: "Calendário Litúrgico Local (Seguro)", url: "https://aistudio.build" }];
      }

      res.json({
        success: true,
        date: targetDateStr,
        readableDate,
        data: {
          ...dataObj,
          sources
        }
      });
    } catch (error: any) {
      console.error("Erro na busca litúrgica:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erro interno ao buscar as informações litúrgicas."
      });
    }
  });

  // API Route - Buscar vídeos no YouTube (usado na aba Salmos)
  app.get("/api/youtube-search", async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) {
        return res.status(400).json({
          success: false,
          error: "Digite algo para localizar no YouTube."
        });
      }

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q.slice(0, 200))}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube respondeu com status ${response.status}`);
      }

      const html = await response.text();
      const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
      if (!match) {
        return res.json({ success: true, videos: [] });
      }

      const data = JSON.parse(match[1]);
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const videos: Array<{
        id: string;
        title: string;
        channel: string;
        duration: string;
        views: string;
        thumbnail: string;
        url: string;
      }> = [];

      const seenIds = new Set<string>();

      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item?.videoRenderer;
          if (!v || !v.videoId || seenIds.has(v.videoId)) continue;
          seenIds.add(v.videoId);

          const title = v.title?.runs?.map((r: any) => r.text).join("") || "Salmo no YouTube";
          const channel = v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || "YouTube";
          const duration = v.lengthText?.simpleText || "";
          const views = v.shortViewCountText?.simpleText || v.viewCountText?.simpleText || "";
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

      res.json({ success: true, videos });
    } catch (error: any) {
      console.error("Erro na busca do YouTube:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Não foi possível localizar vídeos no YouTube."
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
