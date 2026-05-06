import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAi() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI suggestions will not work.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface Suggestion {
  title: string;
  artist?: string;
  category: string;
  liturgicalTime: string;
  description: string;
  url?: string;
}

export async function getLiturgicalSuggestions(liturgicalTime: string, date?: string, category?: string): Promise<Suggestion[]> {
  const gemini = getAi();
  if (!gemini) return [];

  const prompt = `Você é um especialista em liturgia católica. Sua tarefa é sugerir músicas apropriadas para a Missa, baseando-se no calendário litúrgico oficial da Igreja Católica no Brasil (CNBB).

  ${date ? `Data Específica: ${date}` : `Tempo Litúrgico: ${liturgicalTime}`}
  ${category ? `Categoria solicitada: ${category}` : 'Sugira músicas para todas as partes da missa (Entrada, Ato Penitencial, Glória, Salmo Responsorial, Aclamação ao Evangelho, Ofertório, Santo, Cordeiro, Comunhão, Pós-Comunhão e Final).'}
  
  INSTRUÇÕES DE BUSCA:
  1. Utilize o Google Search para encontrar a "Liturgia Diária" para ${date ? `o dia ${date}` : `o tempo de ${liturgicalTime}`}.
  2. Identifique as leituras (Primeira Leitura, Salmo, Segunda Leitura e Evangelho) e a temática central (Ex: Domingo de Páscoa, Pentecostes, 15º Domingo do Tempo Comum).
  3. Busque sugestões de músicas EXCLUSIVAMENTE em sites católicos brasileiros confiáveis (Ex: musica.cancaonova.com, catolicas.org, oitavaeterna.org, portalkairos.org.br, dehonianos.org).
  4. Para cada música sugerida, forneça:
     - Título e Artista (se conhecido).
     - Categoria litúrgica correta.
     - Uma breve descrição explicando por que essa música se encaixa na liturgia do dia (relacionando com as leituras).
     - Um link direto para a cifra ou letra (preferencialmente no Cifra Club ou Letras.mus.br).

  O resultado deve ser um JSON seguindo o esquema fornecido.`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              category: { type: Type.STRING },
              liturgicalTime: { type: Type.STRING },
              description: { type: Type.STRING },
              url: { type: Type.STRING },
            },
            required: ["title", "category", "liturgicalTime", "description"]
          }
        }
      },
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}
