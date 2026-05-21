import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

  // API Route - Chord Tool Generator using Gemini with Google Search Grounding
  app.post("/api/chord-tool/generate", async (req, res) => {
    try {
      const { url, query } = req.body;

      if (!query && !url) {
        return res.status(400).json({ error: "Título/Pesquisa ou link do YouTube é obrigatório." });
      }

      // Reload environment variables so updates to .env are immediately active
      dotenv.config();
      const currentApiKey = process.env.GEMINI_API_KEY;

      if (!currentApiKey) {
        return res.status(503).json({
          error: "O serviço de Inteligência Artificial do Gemini não está configurado. Verifique a chave de API nas configurações ou no .env.",
        });
      }

      // Create a fresh instance with the updated API Key
      const activeAi = new GoogleGenAI({
        apiKey: currentApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Construct powerful query for the Gemini model with search grounding
      let searchPrompt = "";
      if (url && query) {
        searchPrompt = `A música informada é "${query}" e está no link do YouTube: ${url}.`;
      } else if (url) {
        searchPrompt = `Por favor, encontre a música que corresponde a este link do YouTube: ${url}.`;
      } else {
        searchPrompt = `Por favor, encontre a música com a seguinte correspondência de pesquisa: "${query}".`;
      }

      const promptSystem = `Você é um músico profissional, especialista em cifras e arranjos litúrgicos e populares brasileiros. No seu repertório, você tem letras e acordes precisos.
Você deve pesquisar na internet se não souber a letra ou os acordes exatos da música informada pelo usuário.
Para cifras, as cifras em cima das linhas devem estar perfeitamente alinhadas com as sílabas e palavras corretas.
Utilize a notação de cifras comum no Brasil (Dó, Ré, Mi / A, B, C etc.).

RESPONDA EXCLUSIVAMENTE em formato JSON que segue o seguinte esquema:
{
  "title": "Título exato da música",
  "artist": "Nome do artista ou banda",
  "chords": "Linha por linha, a letra com os acordes posicionados acima de cada palavra onde eles mudam. Não adicione cabeçalhos extras dentro da cifra. Se julgar útil, adicione '[Tom: G]' ou similar na primeira linha.",
  "category": "Escolha uma categoria litúrgica ou musical que encaixe melhor nesta música. Deve ser estritamente um destes valores: Entrada, Perdão, Glória, Salmos, Aleluia, Santo, Cordeiro, Comum, Ofertório, Comunhão, Final. Se for música geral, use 'Comum'.",
  "youtubeUrl": "O link do YouTube associado (retorne exatamente o fornecido pelo usuário se houver, ou um link padrão se encontrar)"
}

Certifique-se de que os acordes estejam em formato de texto puro legível. Evite tags HTML na cifra. Use espaçamento regular.`;

      // Use gemini-3.5-flash which is ideal for text/search grounding
      const response = await activeAi.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${searchPrompt}\n\nPor favor, retorne as informações da música de acordo com o padrão exigido.`,
        config: {
          systemInstruction: promptSystem,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "O título oficial da música." },
              artist: { type: Type.STRING, description: "O nome do artista ou banda." },
              chords: { type: Type.STRING, description: "A letra da música com as cifras correspondentes posicionadas acima. Use o alinhamento com espaços." },
              category: { type: Type.STRING, description: "A categoria recomendada. Deve ser um de: Entrada, Perdão, Glória, Salmos, Aleluia, Santo, Cordeiro, Comum, Ofertório, Comunhão, Final." },
              youtubeUrl: { type: Type.STRING, description: "O link do YouTube associado (pode ser o que foi passado no input)." }
            },
            required: ["title", "artist", "chords", "category"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Resposta da IA vazia ou inválida.");
      }

      let musicData;
      try {
        musicData = JSON.parse(responseText.trim());
      } catch (parseErr) {
        console.error("Failed to parse JSON response from Gemini:", responseText);
        throw new Error("A IA gerou uma resposta que não pôde ser lida como JSON válido.");
      }

      return res.json({
        success: true,
        data: {
          title: musicData.title || "",
          artist: musicData.artist || "",
          content: musicData.chords || "",
          category: musicData.category || "Comum",
          youtubeUrl: musicData.youtubeUrl || url || ""
        }
      });
    } catch (err: any) {
      console.error("Error in /api/chord-tool/generate:", err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
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
