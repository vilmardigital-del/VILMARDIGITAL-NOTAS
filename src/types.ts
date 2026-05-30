export type Category = 'Entrada' | 'Perdão' | 'Glória' | 'Salmos' | 'Aleluia' | 'Santo' | 'Cordeiro' | 'Comum' | 'Ofertório' | 'Comunhão' | 'Final' | 'Grupo de Oração';

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
  'Final',
  'Grupo de Oração'
];

export interface Song {
  id: string;
  title: string;
  artist?: string;
  content: string;
  category: Category;
  ownerId: string;
  youtubeUrl?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
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
  isOnline?: boolean;
  lastActive?: number;
  createdBy?: string; // ID of the admin who created them (or "master")
  creatorName?: string; // Name of the creator admin
  createdAt: any;
}
