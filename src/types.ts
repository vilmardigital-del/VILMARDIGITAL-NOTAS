export type Category = 'Entrada' | 'Perdão' | 'Glória' | 'Salmos' | 'Aleluia' | 'Santo' | 'Cordeiro' | 'Comum' | 'Ofertório' | 'Comunhão' | 'Final';

export const CATEGORIES: Category[] = [
  'Entrada',
  'Perdão',
  'Glória',
  'Salmos',
  'Aleluia',
  'Santo',
  'Cordeiro',
  'Comum',
  'Ofertório',
  'Comunhão',
  'Final'
];

export type LiturgicalTime = 
  | 'Tempo Comum' 
  | 'Advento' 
  | 'Natal' 
  | 'Quaresma' 
  | 'Páscoa' 
  | 'Pentecostes' 
  | 'Festas e Solenidades';

export const LITURGICAL_TIMES: LiturgicalTime[] = [
  'Tempo Comum',
  'Advento',
  'Natal',
  'Quaresma',
  'Páscoa',
  'Pentecostes',
  'Festas e Solenidades'
];

export interface Song {
  id: string;
  title: string;
  artist?: string;
  content: string;
  category: Category;
  ownerId: string;
  youtubeUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Playlist {
  id: string;
  title: string;
  date?: string;
  songIds: string[];
  transpositions?: Record<string, number>;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface AccessUser {
  id: string;
  name: string;
  password: string;
  role: 'admin' | 'viewer';
  currentSessionId?: string;
  createdAt: any;
}
