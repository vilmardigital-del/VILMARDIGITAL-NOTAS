import { Category, Song } from '../types';

export type MassMomentKey =
  | 'entrada'
  | 'ato_penitencial'
  | 'gloria'
  | 'salmo'
  | 'ofertorio'
  | 'comunhao'
  | 'final';

export interface MassMomentMeta {
  key: MassMomentKey;
  label: string;
  shortLabel: string;
  appCategory: Category;
  description: string;
}

export const MASS_MOMENTS: MassMomentMeta[] = [
  {
    key: 'entrada',
    label: 'Entrada',
    shortLabel: 'Entrada',
    appCategory: 'Entrada',
    description: 'Abertura da celebração e acolhida da assembleia'
  },
  {
    key: 'ato_penitencial',
    label: 'Ato Penitencial',
    shortLabel: 'Ato Penitencial',
    appCategory: 'Perdão',
    description: 'Súplica de perdão e misericórdia antes do Glória'
  },
  {
    key: 'gloria',
    label: 'Glória',
    shortLabel: 'Glória',
    appCategory: 'Glória',
    description: 'Hino de louvor à Santíssima Trindade'
  },
  {
    key: 'salmo',
    label: 'Salmo',
    shortLabel: 'Salmo',
    appCategory: 'Salmos',
    description: 'Salmo Responsorial meditado conforme a liturgia do dia'
  },
  {
    key: 'ofertorio',
    label: 'Ofertório',
    shortLabel: 'Ofertório',
    appCategory: 'Ofertório',
    description: 'Apresentação das oferendas do pão, do vinho e da vida'
  },
  {
    key: 'comunhao',
    label: 'Comunhão',
    shortLabel: 'Comunhão',
    appCategory: 'Comunhão',
    description: 'Canto eucarístico para o momento da comunhão'
  },
  {
    key: 'final',
    label: 'Final',
    shortLabel: 'Final',
    appCategory: 'Final',
    description: 'Envio missionário e encerramento da Santa Missa'
  }
];

export type LiturgicalSeasonKey = 'comum' | 'advento' | 'natal' | 'quaresma' | 'pascoa';

export interface LiturgicalContext {
  season: LiturgicalSeasonKey;
  seasonLabel: string;
  celebracao: string;
  corLiturgica: string;
  salmoRef: string | null;
  salmoNumber: string | null;
  evangelhoTitulo: string;
  isMarian: boolean;
  isSpirit: boolean;
  isEucharistOrChristKing: boolean;
  isSolemnityOrFeast: boolean;
  gloriaNote: string | null;
  keywords: string[];
}

export interface CuratedSuggestionItem {
  title: string;
  artist: string;
  reason: string;
  youtubeQuery: string;
  matchedAppSong?: Song;
}

export interface MomentSuggestionGroup {
  moment: MassMomentMeta;
  liturgicalNote?: string;
  appSongs: Song[];
  curatedSuggestions: CuratedSuggestionItem[];
  defaultYoutubeQuery: string;
}

export interface LiturgiaInputData {
  tempoLiturgico?: string;
  corLiturgica?: string;
  celebracao?: string;
  leituras?: string[];
  evangelhoTitulo?: string;
  evangelhoTexto?: string;
  readableDate?: string;
}

export const normalizeTextForMatch = (value: string): string => {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractSalmoFromReadings = (leituras: string[] = []): { salmoRef: string | null; salmoNumber: string | null } => {
  for (const leitura of leituras) {
    const lower = normalizeTextForMatch(leitura);
    if (lower.includes('salmo') || /\bsl\b/.test(lower)) {
      const cleanedRef = leitura.replace(/^salmo\s+responsorial:\s*/i, '').trim();
      const numMatch = leitura.match(/(?:salmo|sl)\s*0*(\d{1,3})/i) || leitura.match(/\b0*(\d{1,3})\b/);
      return {
        salmoRef: cleanedRef || leitura,
        salmoNumber: numMatch ? numMatch[1] : null
      };
    }
  }
  return { salmoRef: null, salmoNumber: null };
};

const STOP_WORDS = new Set([
  'para', 'como', 'pelo', 'pela', 'pelos', 'pelas', 'sobre', 'entre', 'com', 'sem',
  'este', 'esta', 'isso', 'aquele', 'aquela', 'tempo', 'comum', 'feira', 'domingo',
  'semana', 'santo', 'santa', 'santos', 'missa', 'leitura', 'evangelho', 'salmo',
  'responsorial', 'dia', 'hoje', 'jesus', 'senhor', 'deus', 'disse', 'tempo', 'naquele'
]);

const extractThemeKeywords = (text: string): string[] => {
  const normalized = normalizeTextForMatch(text);
  const words = normalized.split(' ').filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  return Array.from(new Set(words)).slice(0, 20);
};

export const analyzeLiturgicalContext = (liturgiaData: LiturgiaInputData | null): LiturgicalContext => {
  const tempoRaw = liturgiaData?.tempoLiturgico || 'Tempo Comum';
  const tempoNorm = normalizeTextForMatch(tempoRaw);
  const celebracao = liturgiaData?.celebracao || 'Celebração do Dia';
  const celebNorm = normalizeTextForMatch(celebracao);
  const corLiturgica = liturgiaData?.corLiturgica || 'Verde';
  const evangelhoTitulo = liturgiaData?.evangelhoTitulo || '';
  const evangelhoTexto = liturgiaData?.evangelhoTexto || '';
  const leituras = Array.isArray(liturgiaData?.leituras) ? liturgiaData!.leituras : [];

  let season: LiturgicalSeasonKey = 'comum';
  if (tempoNorm.includes('advento') || celebNorm.includes('advento')) {
    season = 'advento';
  } else if (tempoNorm.includes('natal') || celebNorm.includes('natal') || celebNorm.includes('epifania') || celebNorm.includes('sagrada familia')) {
    season = 'natal';
  } else if (tempoNorm.includes('quaresma') || celebNorm.includes('quaresma') || celebNorm.includes('cinzas') || celebNorm.includes('semana santa') || celebNorm.includes('paixao')) {
    season = 'quaresma';
  } else if (tempoNorm.includes('pascal') || tempoNorm.includes('pascoa') || celebNorm.includes('pascoa') || celebNorm.includes('ressurreicao') || celebNorm.includes('pentecostes') || celebNorm.includes('ascensao')) {
    season = 'pascoa';
  }

  const isMarian = /(nossa senhora|maria|aparecida|fatima|conceicao|imaculada|assuncao|rosario|guadalupe|carmo|auxiliadora|perp[eé]tuo socorro|mae de deus)/i.test(celebNorm);
  const isSpirit = /(pentecostes|espirito santo|divino espirito|crisma)/i.test(celebNorm);
  const isEucharistOrChristKing = /(corpus christi|cristo rei|sagrado coracao|trindade|eucaristia|quinta feira santa)/i.test(celebNorm);
  const isSolemnityOrFeast = /(solenidade|festa|domingo|natal|pascoa|pentecostes|aparecida|corpus christi|cristo rei|todos os santos)/i.test(celebNorm);

  let gloriaNote: string | null = null;
  if (season === 'quaresma' && !isSolemnityOrFeast) {
    gloriaNote = 'Observação litúrgica: no Tempo da Quaresma, o Hino do Glória é normalmente omitido (exceto em Solenidades e Festas).';
  } else if (season === 'advento' && !isSolemnityOrFeast) {
    gloriaNote = 'Observação litúrgica: no Tempo do Advento, o Hino do Glória costuma ser omitido para manter o clima de vigilância e espera (exceto em Solenidades e Festas).';
  }

  const { salmoRef, salmoNumber } = extractSalmoFromReadings(leituras);
  const keywords = extractThemeKeywords(`${celebracao} ${evangelhoTitulo} ${evangelhoTexto}`);

  return {
    season,
    seasonLabel: tempoRaw,
    celebracao,
    corLiturgica,
    salmoRef,
    salmoNumber,
    evangelhoTitulo,
    isMarian,
    isSpirit,
    isEucharistOrChristKing,
    isSolemnityOrFeast,
    gloriaNote,
    keywords
  };
};

interface SuggestionSeed {
  title: string;
  artist: string;
  reason: string;
}

const SEASONAL_REPERTOIRE: Record<LiturgicalSeasonKey, Record<MassMomentKey, SuggestionSeed[]>> = {
  comum: {
    entrada: [
      { title: 'Eis-me Aqui, Senhor', artist: 'CNBB / Hinário Litúrgico', reason: 'Canto clássico de abertura para o Tempo Comum sobre disponibilidade a Deus' },
      { title: 'Alegres Vamos à Casa do Pai', artist: 'Pe. Zezinho / Liturgia', reason: 'Acolhida fraterna da assembleia reunida no Dia do Senhor' },
      { title: 'Toda a Terra Te Adora', artist: 'Comunidade Shalom', reason: 'Louvor solene de abertura para celebrações dominicais' },
      { title: 'Deixa a Luz do Céu Entrar', artist: 'Hinário Católico', reason: 'Convite à escuta da Palavra e renovação espiritual' }
    ],
    ato_penitencial: [
      { title: 'Senhor, Tende Piedade (Kyrie)', artist: 'Comunidade Shalom / Hinário', reason: 'Invocação trinitária tradicional de pedido de perdão' },
      { title: 'Eu Confesso a Deus e a Vós, Irmãos', artist: 'CNBB / Liturgia', reason: 'Fórmula litúrgica penitencial cantada com a assembleia' },
      { title: 'Senhor, Que Viestes Salvar', artist: 'Frei Fabreti / CNBB', reason: 'Ato penitencial orante voltado à misericórdia de Cristo' },
      { title: 'Pelos Pecados, Erros Passados', artist: 'Liturgia Popular', reason: 'Canto de contrição simples e participativo' }
    ],
    gloria: [
      { title: 'Glória a Deus nas Alturas', artist: 'Comunidade Shalom', reason: 'Hino litúrgico fiel ao texto oficial do Missal Romano' },
      { title: 'Glória a Deus nos Altos Céus', artist: 'CNBB / Hinário Litúrgico', reason: 'Arranjo tradicional de fácil canto para toda a comunidade' },
      { title: 'Glória (Eliana Ribeiro / Canção Nova)', artist: 'Canção Nova', reason: 'Versão vibrante muito utilizada em missas comunitárias' },
      { title: 'Glória a Deus no Céu e na Terra Paz', artist: 'Pe. Ney Brasil', reason: 'Melodia clássica litúrgica para o Tempo Comum' }
    ],
    salmo: [
      { title: 'Melodia do Salmo Responsorial do Dia', artist: 'CNBB / Canal Salmos', reason: 'Cantar o refrão exatamente conforme a liturgia oficial da data' },
      { title: 'O Senhor É Meu Pastor (Salmo 22)', artist: 'Pe. Zezinho / Liturgia', reason: 'Referência clássica para celebrações do Bom Pastor e confiança' },
      { title: 'Provai e Vede (Salmo 33)', artist: 'CNBB / Hinário Litúrgico', reason: 'Salmo muito utilizado no Tempo Comum e nas missas eucarísticas' }
    ],
    ofertorio: [
      { title: 'Sabes, Senhor', artist: 'CNBB / Hinário Litúrgico', reason: 'Oferta da vida, do trabalho e dos dons sobre o altar' },
      { title: 'Bendito Sejas, Ó Rei da Glória', artist: 'Pe. José Weber / CNBB', reason: 'Apresentação do pão e do vinho fiel à oração litúrgica' },
      { title: 'A Ti Meu Deus', artist: 'Comunidade Shalom / Liturgia', reason: 'Entrega pessoal junto às oferendas do pão e do vinho' },
      { title: 'Um Coração Para Amar', artist: 'Pe. Zezinho', reason: 'Ofertamento do coração e do serviço ao próximo' }
    ],
    comunhao: [
      { title: 'Eis que Sou o Pão da Vida', artist: 'CNBB / Hinário Litúrgico', reason: 'Canto eucarístico centrado em Jesus, Pão Vivo descido do céu' },
      { title: 'Vem, Eu Mostrarei (Sonda-me)', artist: 'Waldeci Farias / Liturgia', reason: 'Intimidade orante com Cristo na comunhão' },
      { title: 'Eu Quis Comer Esta Ceia Agora', artist: 'Pe. José Weber', reason: 'Canto tradicional de comunhão inspirado na Última Ceia' },
      { title: 'Sacramento da Comunhão', artist: 'Diácono Nelsinho Corrêa', reason: 'Adoração e ação de graças ao receber a Eucaristia' }
    ],
    final: [
      { title: 'Ide por Todo o Universo', artist: 'CNBB / Liturgia', reason: 'Canto de envio missionário após a bênção final' },
      { title: 'Segura na Mão de Deus', artist: 'Pe. Zezinho / Popular', reason: 'Encerramento alegre de confiança para a semana' },
      { title: 'Anunciaremos o Teu Reino', artist: 'Frei Fabreti', reason: 'Compromisso cristão de levar o Evangelho ao mundo' },
      { title: 'Eu Seguirei', artist: 'Frei Gilson', reason: 'Disposição de seguir a Cristo no cotidiano' }
    ]
  },
  advento: {
    entrada: [
      { title: 'Senhor, Vem Salvar Teu Povo', artist: 'CNBB / Hinário Litúrgico', reason: 'Súplica própria do Advento pela vinda do Salvador' },
      { title: 'Ouve-se na Terra um Grito', artist: 'Reginaldo Veloso / CNBB', reason: 'Chamado profético à vigilância e preparação dos caminhos' },
      { title: 'Maranathá (Vem, Senhor Jesus)', artist: 'Comunidade Shalom / Liturgia', reason: 'Abertura orante de expectativa messiânica' },
      { title: 'Vigiai, Vigiai Eu Vos Digo', artist: 'CNBB / Hinário Litúrgico', reason: 'Canto tradicional para os domingos do Advento' }
    ],
    ato_penitencial: [
      { title: 'Senhor, Que Vens ao Encontro', artist: 'CNBB / Advento', reason: 'Ato penitencial próprio para preparar o coração para o Natal' },
      { title: 'Senhor, Tende Piedade (Advento)', artist: 'Pe. Ney Brasil', reason: 'Melodia sóbria e contemplativa adequada ao Tempo do Advento' },
      { title: 'Eu Confesso a Deus', artist: 'Liturgia CNBB', reason: 'Súplica de conversão para endireitar os caminhos do Senhor' }
    ],
    gloria: [
      { title: 'Glória (Somente em Solenidades/Festas)', artist: 'CNBB / Missal Romano', reason: 'No Advento o Glória é omitido nos domingos, reservado a solenidades como Imaculada Conceição' },
      { title: 'Glória a Deus nas Alturas (Sóbrio)', artist: 'Comunidade Shalom', reason: 'Opção caso a data celebre Solenidade ou Festa litúrgica' }
    ],
    salmo: [
      { title: 'Melodia do Salmo do Advento do Dia', artist: 'CNBB / Canal Salmos', reason: 'Antífona própria do Salmo Responsorial da celebração' },
      { title: 'Mostrai-nos, Ó Senhor, Vossa Bondade (Sl 84)', artist: 'CNBB / Hinário Litúrgico', reason: 'Salmo clássico do Tempo do Advento' }
    ],
    ofertorio: [
      { title: 'As Nossas Mãos Se Abrem', artist: 'CNBB / Advento', reason: 'Ofertório de espera e esperança do povo que aguarda o Senhor' },
      { title: 'A Nossa Oferta Apresentamos no Altar', artist: 'Hinário Litúrgico', reason: 'Preparação das oferendas na espiritualidade da vinda de Cristo' },
      { title: 'Do Céu Vai Descer o Cordeiro', artist: 'Reginaldo Veloso / CNBB', reason: 'Canto tradicional do Advento para a apresentação dos dons' }
    ],
    comunhao: [
      { title: 'O Senhor Virá Libertar o Seu Povo', artist: 'CNBB / Hinário Litúrgico', reason: 'Comunhão centrada na promessa do Emanuel, Deus conosco' },
      { title: 'Vigiai e Orai (Eis que Venho em Breve)', artist: 'Liturgia do Advento', reason: 'Comunhão espiritual em atitude de vigilância' },
      { title: 'Vem, Senhor, Nos Visitar', artist: 'Frei Fabreti', reason: 'Encontro com Jesus na Eucaristia enquanto aguardamos sua vinda' }
    ],
    final: [
      { title: 'Da Cepa Brotou a Rama', artist: 'Reginaldo Veloso / CNBB', reason: 'Canto mariano-messiânico muito tradicional do Advento' },
      { title: 'Vem, Senhor, Não Tardes Mais', artist: 'Hinário Litúrgico', reason: 'Envio em atitude de esperança e preparação para o Natal' },
      { title: 'Maria de Nazaré', artist: 'Pe. Zezinho', reason: 'Contemplação de Maria como modelo de espera no Advento' }
    ]
  },
  natal: {
    entrada: [
      { title: 'Nasceu-nos Hoje um Menino', artist: 'Pe. José Weber / CNBB', reason: 'Abertura solene de alegria pelo nascimento do Salvador' },
      { title: 'Vinde Cristãos, Vinde à Porfia (Adeste Fideles)', artist: 'Hinário Católico', reason: 'Hino tradicional de Natal convidando à adoração em Belém' },
      { title: 'Noite Feliz', artist: 'Tradicional Natalino', reason: 'Abertura contemplativa e tradicional para celebrações natalinas' },
      { title: 'Cristãos, Vinde Todos', artist: 'CNBB / Hinário Litúrgico', reason: 'Canto festivo de Natal para toda a assembleia' }
    ],
    ato_penitencial: [
      { title: 'Senhor, Que Nascestes em Belém', artist: 'Liturgia do Natal / CNBB', reason: 'Ato penitencial adaptado à encarnação do Filho de Deus' },
      { title: 'Senhor, Tende Piedade (Festivo)', artist: 'Comunidade Shalom', reason: 'Súplica de misericórdia no Tempo do Natal' }
    ],
    gloria: [
      { title: 'Glória a Deus nas Alturas (Natal)', artist: 'CNBB / Hinário Litúrgico', reason: 'O canto dos anjos em Belém exaltado na celebração natalina' },
      { title: 'Anjos Cantam Glória a Deus', artist: 'Pe. Ney Brasil', reason: 'Glória festivo clássico do Tempo do Natal' }
    ],
    salmo: [
      { title: 'Melodia do Salmo do Dia (Natal)', artist: 'CNBB / Canal Salmos', reason: 'Proclamação cantada do Salmo Responsorial do Tempo do Natal' },
      { title: 'Hoje Nasceu para Nós o Salvador (Salmo 95)', artist: 'CNBB / Liturgia', reason: 'Salmo clássico da Missa do Natal' }
    ],
    ofertorio: [
      { title: 'Cristãos, Vinde Todos com Alegria Ofertar', artist: 'CNBB / Hinário Litúrgico', reason: 'Apresentação dos dons inspirada nos presentes dos pastores e magos' },
      { title: 'Longe, Distante de Casa (Ofertório de Natal)', artist: 'Liturgia Popular', reason: 'Oferta da vida diante da manjedoura' }
    ],
    comunhao: [
      { title: 'O Verbo Se Fez Carne e Habitou Entre Nós', artist: 'CNBB / Hinário Litúrgico', reason: 'Canto eucarístico sobre o Verbo Encarnado' },
      { title: 'No Presépio Pequenino', artist: 'Pe. José Weber / CNBB', reason: 'Comunhão contemplativa do Mistério da Encarnação' },
      { title: 'Pão de Belém', artist: 'Hinário Litúrgico', reason: 'Relação entre Belém ("Casa do Pão") e a Eucaristia' }
    ],
    final: [
      { title: 'Bate o Sino / Noite Feliz (Envio)', artist: 'Tradicional Natalino', reason: 'Envio jubiloso anunciando a paz do Menino Jesus' },
      { title: 'Então É Natal / Glória ao Menino Rei', artist: 'Liturgia Popular', reason: 'Encerramento festivo para o Tempo do Natal' }
    ]
  },
  quaresma: {
    entrada: [
      { title: 'Eis o Tempo de Conversão', artist: 'CNBB / Hinário Litúrgico', reason: 'Canto clássico de abertura para o Tempo da Quaresma' },
      { title: 'Volta ao Teu Deus', artist: 'Reginaldo Veloso / CNBB', reason: 'Chamado ao arrependimento, jejum e caridade' },
      { title: 'Acalma Minha Tempestade', artist: 'Comunidade / Católica', reason: 'Oração de entrega e confiança nas provações quaresmais' },
      { title: 'Agora É Tempo de Ser Igreja', artist: 'Pe. Zezinho / CNBB', reason: 'Compromisso de conversão comunitária na Quaresma' }
    ],
    ato_penitencial: [
      { title: 'Senhor, Tende Piedade de Nós (Quaresma)', artist: 'CNBB / Pe. José Weber', reason: 'Melodia penitencial sóbria sem instrumentos festivos' },
      { title: 'Piedade, Ó Senhor, Piedade', artist: 'Hinário Litúrgico CNBB', reason: 'Inspirado no Salmo 50, próprio para o espírito quaresmal' },
      { title: 'Tende Compaixão de Nós, Senhor', artist: 'Comunidade Shalom / Liturgia', reason: 'Ato penitencial orante para dias de conversão' }
    ],
    gloria: [
      { title: 'Na Quaresma o Glória é Omitido', artist: 'Missal Romano / CNBB', reason: 'Conforme as normas litúrgicas, não se canta o Glória na Quaresma (exceto Solenidades como São José e Anunciação)' },
      { title: 'Glória (Uso exclusivo em Solenidades)', artist: 'CNBB', reason: 'Utilizar apenas se a data celebrar Solenidade prevista no calendário' }
    ],
    salmo: [
      { title: 'Melodia do Salmo Quaresmal do Dia', artist: 'CNBB / Canal Salmos', reason: 'Salmo meditado em tom sóbrio (sem Aleluia antes do Evangelho)' },
      { title: 'Piedade, Ó Senhor (Salmo 50)', artist: 'CNBB / Hinário Litúrgico', reason: 'Salmo penitencial tradicional da Quaresma' }
    ],
    ofertorio: [
      { title: 'Sê Bendito, Senhor, Para Sempre', artist: 'Pe. José Weber / CNBB', reason: 'Ofertório quaresmal de humildade e reconciliação' },
      { title: 'Recebe, Deus Amigo', artist: 'Frei Fabreti / Liturgia', reason: 'Apresentação dos dons unida ao jejum e à partilha' },
      { title: 'Todo Povo Sofredor', artist: 'Campanha da Fraternidade / CNBB', reason: 'Oferta da vida e da solidariedade com os irmãos' }
    ],
    comunhao: [
      { title: 'Prova de Amor Maior Não Há', artist: 'Pe. José Weber / CNBB', reason: 'Meditação eucarística sobre o amor redentor da Cruz' },
      { title: 'Eu Vim Para Que Todos Tenham Vida', artist: 'Pe. José Weber / CNBB', reason: 'Canto clássico de comunhão muito utilizado na Quaresma' },
      { title: 'Deserto / No Silêncio do Altar', artist: 'Católica', reason: 'Interioridade e encontro com o Senhor na Eucaristia' }
    ],
    final: [
      { title: 'Vitória, Tu Reinarás (Ó Cruz)', artist: 'Hinário Católico / CNBB', reason: 'Canto de fé na vitória da Cruz ao final da celebração' },
      { title: 'Caminhamos na Luz de Deus', artist: 'Liturgia Quaresmal', reason: 'Envio para viver a conversão e a caridade na semana' },
      { title: 'Eu Te Levantarei', artist: 'Frei Gilson / Católica', reason: 'Esperança e força espiritual para vencer o deserto' }
    ]
  },
  pascoa: {
    entrada: [
      { title: 'O Senhor Ressuscitou, Aleluia!', artist: 'CNBB / Hinário Litúrgico', reason: 'Aclamação pascal de júbilo pela vitória sobre a morte' },
      { title: 'Novo Sol Brilhou', artist: 'Pe. José Weber / CNBB', reason: 'Abertura festiva celebrando a manhã da Ressurreição' },
      { title: 'Cristo Ressuscitou, Aleluia!', artist: 'Comunidade Shalom / Liturgia', reason: 'Canto alegre próprio do Tempo Pascal' },
      { title: 'Por Sua Morte, a Morte Viu o Fim', artist: 'Reginaldo Veloso / CNBB', reason: 'Entrada solene para os domingos da Páscoa' }
    ],
    ato_penitencial: [
      { title: 'Aspersão com Água Benta (Banhados em Cristo)', artist: 'CNBB / Tempo Pascal', reason: 'No Tempo Pascal, recomenda-se o rito de aspersão batismal em lugar do Ato Penitencial' },
      { title: 'Senhor, Que Vencestes a Morte', artist: 'CNBB / Hinário Litúrgico', reason: 'Invocação penitencial luminosa para o Tempo Pascal' }
    ],
    gloria: [
      { title: 'Glória a Deus nas Alturas (Pascal)', artist: 'Comunidade Shalom', reason: 'Hino festivo cantado com alegria durante os 50 dias da Páscoa' },
      { title: 'Glória, Glória, Aleluia', artist: 'Hinário Litúrgico CNBB', reason: 'Celebração da glória do Ressuscitado' }
    ],
    salmo: [
      { title: 'Melodia do Salmo Pascal do Dia', artist: 'CNBB / Canal Salmos', reason: 'Salmo Responsorial do dia com Aleluia pascal' },
      { title: 'Este É o Dia que o Senhor Fez para Nós (Salmo 117)', artist: 'CNBB / Hinário Litúrgico', reason: 'Salmo por excelência da celebração pascal' }
    ],
    ofertorio: [
      { title: 'Bendito Sejais, Senhor, Deus do Universo', artist: 'CNBB / Páscoa', reason: 'Ofertório festivo em ação de graças pelo Cristo Ressuscitado' },
      { title: 'Em Procissão Vão o Pão e o Vinho', artist: 'Pe. José Weber / CNBB', reason: 'Canto alegre de apresentação das oferendas' },
      { title: 'Ofertas Singelas', artist: 'Hinário Litúrgico', reason: 'Pão e vinho que se tornam o Corpo do Ressuscitado' }
    ],
    comunhao: [
      { title: 'Celebrai a Cristo, Celebrai (Ressuscitou)', artist: 'Louvor / Liturgia Pascal', reason: 'Alegria eucarística na presença do Senhor vivo' },
      { title: 'Antes da Morte e Ressurreição de Jesus', artist: 'CNBB / Hinário Litúrgico', reason: 'Anúncio da Páscoa do Senhor no partir do pão' },
      { title: 'Na Mesa Sagrada Se Faz Unidade', artist: 'Pe. José Weber / CNBB', reason: 'Comunhão dos discípulos que reconhecem Jesus no partir do pão (Emaús)' }
    ],
    final: [
      { title: 'Ide por Todo o Mundo (Aleluia Pascal)', artist: 'CNBB / Hinário Litúrgico', reason: 'Envio das testemunhas da Ressurreição' },
      { title: 'Vencedor / Guerreiro Adorador', artist: 'Católica', reason: 'Louvor final celebrando a vitória de Cristo' }
    ]
  }
};

const MARIAN_OVERRIDES: Partial<Record<MassMomentKey, SuggestionSeed[]>> = {
  entrada: [
    { title: 'Com Minha Mãe Estarei', artist: 'Tradicional Mariano', reason: 'Abertura mariana festiva em honra à Virgem Maria' },
    { title: 'Quem É Esta que Avança Como Aurora', artist: 'Comunidade / CNBB', reason: 'Entrada solene para festas e memórias de Nossa Senhora' }
  ],
  ofertorio: [
    { title: 'Sobe a Jerusalém', artist: 'Pe. Zezinho / Hinário', reason: 'Ofertório com Maria caminhando com o povo rumo ao altar' }
  ],
  comunhao: [
    { title: 'Colo de Mãe', artist: 'Comunidade Católica Colo de Deus', reason: 'Comunhão e intimidade sob o amparo materno de Maria' },
    { title: 'Maria, Cheia de Graça (Magnificat)', artist: 'CNBB / Hinário Litúrgico', reason: 'Ação de graças mariana após a comunhão' }
  ],
  final: [
    { title: 'Consagração a Nossa Senhora (Ó Minha Senhora e Minha Mãe)', artist: 'Tradicional Mariano', reason: 'Encerramento clássico consagrando a assembleia a Maria' },
    { title: 'Nossa Senhora', artist: 'Roberto Carlos / Pe. Antônio Maria', reason: 'Canto devocional muito acolhido pela comunidade ao final' }
  ]
};

const SPIRIT_OVERRIDES: Partial<Record<MassMomentKey, SuggestionSeed[]>> = {
  entrada: [
    { title: 'A Nós Descei, Divina Luz', artist: 'CNBB / Hinário Litúrgico', reason: 'Hino litúrgico clássico de invocação ao Espírito Santo' },
    { title: 'Vem, Espírito Santo (Envia Teu Espírito)', artist: 'Frei Fabreti / Liturgia', reason: 'Abertura solene para Pentecostes e festas do Espírito' }
  ],
  ofertorio: [
    { title: 'Vem Queimar o Nosso Coração', artist: 'Católica', reason: 'Oferta do coração inflamado pelo Espírito Santo' }
  ],
  comunhao: [
    { title: 'Espírito Enche a Minha Vida', artist: 'Renovação / Católica', reason: 'Oração eucarística pedindo a unção do Espírito' }
  ],
  final: [
    { title: 'Sopro de Deus / Movidos pelo Espírito', artist: 'Comunidade Shalom / CNBB', reason: 'Envio missionário na força de Pentecostes' }
  ]
};

const scoreSongForContext = (song: Song, moment: MassMomentMeta, ctx: LiturgicalContext): number => {
  const songTitleNorm = normalizeTextForMatch(song.title);
  const songContentNorm = normalizeTextForMatch(song.content || '');
  const fullSongNorm = `${songTitleNorm} ${songContentNorm}`;
  let score = 0;

  if (song.category === moment.appCategory) {
    score += 100;
  } else if (ctx.isMarian && song.category === 'Mariana' && ['entrada', 'ofertorio', 'comunhao', 'final'].includes(moment.key)) {
    score += 75;
  } else if (ctx.isSpirit && song.category === 'Espírito Santo' && ['entrada', 'ofertorio', 'comunhao', 'final'].includes(moment.key)) {
    score += 75;
  } else if (moment.key === 'comunhao' && song.category === 'Adoração') {
    score += 40;
  } else if (moment.key === 'gloria' && song.category === 'Louvor') {
    score += 35;
  } else {
    return 0;
  }

  // Correspondência exata do Salmo do dia
  if (moment.key === 'salmo' && ctx.salmoNumber) {
    const salmoExactRegex = new RegExp(`(?:salmo|sl)\\s*0*${ctx.salmoNumber}\\b`, 'i');
    if (salmoExactRegex.test(song.title || '') || salmoExactRegex.test(song.content || '')) {
      score += 200;
    }
  }

  // Palavras-chave do tempo litúrgico
  const seasonTerms: Record<LiturgicalSeasonKey, string[]> = {
    advento: ['advento', 'vigiai', 'maranatha', 'preparai', 'vem senhor', 'espera'],
    natal: ['natal', 'belem', 'menino', 'presepio', 'nasceu', 'emanuel', 'noite feliz'],
    quaresma: ['quaresma', 'conversao', 'deserto', 'cruz', 'perdao', 'misericordia', 'jejum', 'cinzas'],
    pascoa: ['pascoa', 'ressuscitou', 'ressurreicao', 'aleluia', 'venceu', 'vida nova'],
    comum: ['reino', 'amor', 'igreja', 'caminho', 'pastor', 'palavra', 'fe', 'luz']
  };

  for (const term of seasonTerms[ctx.season]) {
    if (fullSongNorm.includes(term)) {
      score += 18;
    }
  }

  // Palavras-chave do Evangelho / Celebração do dia
  for (const kw of ctx.keywords) {
    if (songTitleNorm.includes(kw)) {
      score += 15;
    } else if (songContentNorm.includes(kw)) {
      score += 6;
    }
  }

  // Prioridade leve para cifras já com vídeo do YouTube ou sincronizadas
  if (song.youtubeUrl) score += 4;
  if (Array.isArray(song.timings) && song.timings.length > 0) score += 3;

  return score;
};

const findMatchedSongInLibrary = (suggestionTitle: string, songs: Song[], preferredCategory: Category): Song | undefined => {
  const cleanTarget = normalizeTextForMatch(suggestionTitle.replace(/\([^)]*\)/g, ''));
  if (!cleanTarget || cleanTarget.length < 4) return undefined;

  const exactInCat = songs.find(
    (s) => s.category === preferredCategory && normalizeTextForMatch(s.title) === cleanTarget
  );
  if (exactInCat) return exactInCat;

  const exactAny = songs.find((s) => normalizeTextForMatch(s.title) === cleanTarget);
  if (exactAny) return exactAny;

  const targetWords = cleanTarget.split(' ').filter((w) => w.length >= 3);
  if (targetWords.length < 2) return undefined;

  return songs.find((s) => {
    const sNorm = normalizeTextForMatch(s.title);
    return targetWords.every((w) => sNorm.includes(w));
  });
};

export const buildMomentYoutubeQuery = (momentKey: MassMomentKey, ctx: LiturgicalContext): string => {
  const seasonSearchMap: Record<LiturgicalSeasonKey, string> = {
    comum: 'Tempo Comum',
    advento: 'Tempo do Advento',
    natal: 'Tempo do Natal',
    quaresma: 'Tempo da Quaresma',
    pascoa: 'Tempo Pascal'
  };

  const seasonLabel = seasonSearchMap[ctx.season];
  const feastHint = ctx.isMarian
    ? 'Nossa Senhora'
    : ctx.isSpirit
      ? 'Espírito Santo'
      : seasonLabel;

  switch (momentKey) {
    case 'entrada':
      return `Canto de Entrada ${feastHint} missa católica`;
    case 'ato_penitencial':
      return `Ato Penitencial ${seasonLabel} missa católica`;
    case 'gloria':
      return `Hino do Glória ${ctx.season === 'natal' || ctx.season === 'pascoa' ? seasonLabel : ''} missa católica`;
    case 'salmo':
      return ctx.salmoNumber
        ? `Melodia do Salmo ${ctx.salmoNumber}`
        : `Melodia do Salmo Responsorial ${ctx.celebracao}`;
    case 'ofertorio':
      return `Canto de Ofertório ${feastHint} missa católica`;
    case 'comunhao':
      return `Canto de Comunhão ${feastHint} missa católica`;
    case 'final':
      return `Canto Final ${feastHint} missa católica`;
  }
};

export const generateLiturgicalSuggestions = (
  liturgiaData: LiturgiaInputData | null,
  songs: Song[]
): { context: LiturgicalContext; groups: MomentSuggestionGroup[] } => {
  const context = analyzeLiturgicalContext(liturgiaData);
  const seasonData = SEASONAL_REPERTOIRE[context.season];

  const groups: MomentSuggestionGroup[] = MASS_MOMENTS.map((moment) => {
    // 1. Músicas do repertório do app ranqueadas para o dia
    const scoredAppSongs = songs
      .map((song) => ({ song, score: scoreSongForContext(song, moment, context) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.song);

    // 2. Sugestões litúrgicas curadas para o tempo + festa + salmo do dia
    let seeds: SuggestionSeed[] = [...(seasonData[moment.key] || [])];

    if (context.isMarian && MARIAN_OVERRIDES[moment.key]) {
      seeds = [...MARIAN_OVERRIDES[moment.key]!, ...seeds];
    }
    if (context.isSpirit && SPIRIT_OVERRIDES[moment.key]) {
      seeds = [...SPIRIT_OVERRIDES[moment.key]!, ...seeds];
    }

    if (moment.key === 'salmo' && context.salmoNumber) {
      const salmoDynamic: SuggestionSeed = {
        title: `Melodia do Salmo ${context.salmoNumber} (${context.salmoRef || 'Liturgia do Dia'})`,
        artist: 'CNBB / Salmos Cantados',
        reason: `Salmo oficial indicado para ${context.celebracao}`
      };
      seeds = [salmoDynamic, ...seeds.filter((s) => !s.title.includes('Salmo Responsorial do Dia'))];
    }

    const uniqueSeeds: SuggestionSeed[] = [];
    const seenTitles = new Set<string>();
    for (const seed of seeds) {
      const norm = normalizeTextForMatch(seed.title);
      if (seenTitles.has(norm)) continue;
      seenTitles.add(norm);
      uniqueSeeds.push(seed);
      if (uniqueSeeds.length >= 4) break;
    }

    const curatedSuggestions: CuratedSuggestionItem[] = uniqueSeeds.map((seed) => {
      const matchedAppSong = findMatchedSongInLibrary(seed.title, songs, moment.appCategory);
      const ytQuery =
        moment.key === 'salmo' && context.salmoNumber && seed.title.includes(`Salmo ${context.salmoNumber}`)
          ? `Melodia do Salmo ${context.salmoNumber}`
          : `${seed.title.replace(/\([^)]*\)/g, '').trim()} cifra missa católica`;

      return {
        title: seed.title,
        artist: seed.artist,
        reason: seed.reason,
        youtubeQuery: ytQuery,
        matchedAppSong
      };
    });

    const liturgicalNote = moment.key === 'gloria' ? context.gloriaNote || undefined : undefined;

    return {
      moment,
      liturgicalNote,
      appSongs: scoredAppSongs,
      curatedSuggestions,
      defaultYoutubeQuery: buildMomentYoutubeQuery(moment.key, context)
    };
  });

  return { context, groups };
};
