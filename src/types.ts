export type Category = 'Entrada' | 'Perdão' | 'Glória' | 'Salmos' | 'Aleluia' | 'Santo' | 'Cordeiro' | 'Comum' | 'Ofertório' | 'Comunhão' | 'Final' | 'Grupo de Oração' | 'Espírito Santo' | 'Louvor' | 'Mariana' | 'Entrega' | 'Adoração';

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
  'Grupo de Oração',
  'Espírito Santo',
  'Louvor',
  'Mariana',
  'Entrega',
  'Adoração'
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
  role: 'master' | 'admin' | 'viewer';
  currentSessionId?: string;
  isOnline?: boolean;
  lastActive?: number;
  createdBy?: string; // ID of the admin who created them (or "master")
  creatorName?: string; // Name of the creator admin
  createdAt: any;
}

export interface MuralEvent {
  id: string;
  name: string;
  date: string;
  createdAt?: any;
}

export interface MassaPhoto {
  id: string;
  url: string;
  date: string;
  description?: string;
  storagePath?: string;
  createdAt: any;
  isBase64?: boolean;
}
