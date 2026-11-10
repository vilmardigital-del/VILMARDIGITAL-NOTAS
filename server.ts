import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { getSantoDoDia, getReflexaoEspiritual } from "./src/santos_db";

dotenv.config();

let aiInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave da API Gemini (GEMINI_API_KEY) não foi configurada.");
    }
    aiInstance = new GoogleGenAI({
      apiKey
    });
  }
  return aiInstance;
}

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

  // API Route - Buscar Cifra de Qualquer Site / Música com IA (Google Search Grounding)
  app.post("/api/fetch-chords", async (req, res) => {
    try {
      const { title, artist, onlyIntroAndChords } = req.body;

      if (!title || typeof title !== "string" || title.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Por favor, informe o título da música."
        });
      }

      const songTitle = title.trim();
      const songArtist = (artist && typeof artist === "string") ? artist.trim() : "";

      const prompt = `Você é um músico profissional especialista em transcrever e formatar cifras musicais completas e precisas para violão e teclado em português.
Forneça a cifra exata, em português, da música "${songTitle}" ${songArtist ? `do artista/banda "${songArtist}"` : ''}.

REQUISITOS OBRIGATÓRIOS DE FORMATAÇÃO:
1. Comece na PRIMEIRA LINHA indicando o Tom original (ex: "Tom: G" ou "Tom: D").
2. Na linha seguinte, inclua a Introdução com a sequência de acordes (ex: "[Intro] G  D/F#  Em  C" ou "Introdução: G  D/F#  Em  C").
3. Mantenha a grafia dos acordes no padrão brasileiro tradicional (C, D, E, F, G, A, B, Fm, C7, D/F#, Bm7, etc.).
${onlyIntroAndChords ? '4. O usuário solicitou APENAS a INTRODUÇÃO e os ACORDES / ESTRUTURA HARMÔNICA. Não inclua estrofes longas de letras, apenas o Tom, a Introdução e os acordes.' : '4. Inclua a cifra completa com o Tom, a Introdução, estrofes com acordes alinhados acima da letra, refrão e final.'}
5. Retorne APENAS o texto da cifra, formatado de maneira limpa para leitura monoespaçada. NÃO inclua blocos de código markdown (como \`\`\` text ou \`\`\`cifra), não adicione explicações, comentários ou saudações.`;

      let chordContent = "";

      // 1ª Tentativa: Gemini com ferramenta de Busca (Google Search)
      try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        chordContent = response.text || "";
      } catch (geminiSearchErr: any) {
        console.warn("Busca com Google Search falhou, tentando geração direta do Gemini:", geminiSearchErr?.message || geminiSearchErr);
        
        // 2ª Tentativa: Conhecimento nativo do Gemini (sem ferramentas externas)
        try {
          const ai = getGenAI();
          const responseFallback = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
          });
          chordContent = responseFallback.text || "";
        } catch (fallbackErr: any) {
          console.error("Erro na geração direta do Gemini:", fallbackErr);
          throw fallbackErr;
        }
      }

      // Limpar potenciais marcadores markdown (```, ```cifra, etc)
      chordContent = chordContent
        .replace(/^```[a-zA-Z]*\n?/gm, '')
        .replace(/\n?```$/gm, '')
        .trim();

      if (!chordContent) {
        return res.status(404).json({
          success: false,
          error: "Não foi possível obter a cifra para esta música no momento."
        });
      }

      res.json({
        success: true,
        title: songTitle,
        artist: songArtist,
        content: chordContent
      });
    } catch (error: any) {
      console.error("Erro no /api/fetch-chords:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erro ao buscar a cifra."
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
