import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAi() {
  if (!ai) {
    // Try process.env first (defined in vite.config.ts), fallback to import.meta.env
    const apiKey = (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) || 
                   import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("GEMINI_API_KEY ou VITE_GEMINI_API_KEY não está definido. As sugestões de IA não funcionarão.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface Suggestion {
  title: string;
  source: string;
  url: string;
  icon?: string;
}

export function getGoogleSearchUrl(liturgicalTime: string, date?: string): string {
  let query = "Liturgia Diária";
  if (date) {
    const d = new Date(date + 'T12:00:00');
    const formattedDate = d.toLocaleDateString('pt-BR');
    query += ` ${formattedDate}`;
  } else {
    query += ` ${liturgicalTime}`;
  }
  
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function getMusicSuggestionsSearchUrl(liturgicalTime: string, date?: string): string {
  let query = "Sugestões de músicas para missa";
  if (date) {
    const d = new Date(date + 'T12:00:00');
    const formattedDate = d.toLocaleDateString('pt-BR');
    query += ` ${formattedDate}`;
  } else {
    query += ` ${liturgicalTime}`;
  }
  
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export const LITURGY_SOURCES = [
  { name: 'Canção Nova', url: 'https://liturgia.cancaonova.com/pb/' },
  { name: 'CNBB', url: 'https://www.cnbb.org.br/liturgia-diaria/' },
  { name: 'Catolicas.org', url: 'https://www.catolicas.org.br/' },
  { name: 'Dehonianos', url: 'https://www.dehonianos.org/portal/liturgia-diaria/' }
];
