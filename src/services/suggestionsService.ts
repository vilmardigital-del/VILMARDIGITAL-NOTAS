import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Suggestion {
  title: string;
  artist?: string;
  category: string;
  liturgicalTime: string;
  description: string;
  url?: string;
}

export async function getLiturgicalSuggestions(liturgicalTime: string, date?: string, category?: string): Promise<Suggestion[]> {
  const prompt = `Envie sugestões de músicas católicas para missa. 
  ${date ? `Data Específica: ${date}` : `Tempo Litúrgico: ${liturgicalTime}`}
  ${category ? `Categoria: ${category}` : 'Todas as categorias (Entrada, Perdão, Glória, Salmos, Aleluia, Ofertório, Santo, Cordeiro, Comunhão/Comum, Final)'}
  
  ${date ? `Por favor, faça uma busca na internet pela liturgia diária específica para o dia ${date}. Identifique as leituras e o tema do dia para sugerir músicas apropriadas.` : 'Por favor, faça uma busca na internet por seleções populares e liturgicamente corretas para o tempo litúrgico informado.'}
  Para cada música sugerida, tente encontrar um link direto para a cifra ou letra (preferencialmente no ciferaclub.com.br ou musixmatch.com ou letras.mus.br).
  O resultado deve ser um JSON seguindo o esquema fornecido.`;

  try {
    const response = await ai.models.generateContent({
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
