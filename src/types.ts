export type Category = 'Entrada' | 'Perdão' | 'Glória' | 'Salmos' | 'Aleluia' | 'Santo' | 'Cordeiro' | 'Comum' | 'Ofertório' | 'Final';

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
  'Final'
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
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}
