export type Category = 'Entrada' | 'Perdão' | 'Glória' | 'Santo' | 'Aleluia' | 'Comum' | 'Ofertório' | 'Final';

export const CATEGORIES: Category[] = [
  'Entrada',
  'Perdão',
  'Glória',
  'Santo',
  'Aleluia',
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
