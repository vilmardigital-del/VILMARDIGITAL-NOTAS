export type Category = 'Entrada' | 'Perdão' | 'Glória' | 'Salmos' | 'Aleluia' | 'Santo' | 'Cordeiro' | 'Comum' | 'Ofertório' | 'Comunhão' | 'Final' | 'Grupo de Oração' | 'Espírito Santo' | 'Louvor' | 'Mariana' | 'Entrega' | 'Adoração' | 'Amor de Deus' | 'Salvação' | 'Fé' | 'Senhorio de Jesus' | 'Cura interior' | 'Perseverança' | 'Promessa do Pai';

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
  'Adoração',
  'Amor de Deus',
  'Salvação',
  'Fé',
  'Senhorio de Jesus',
  'Cura interior',
  'Perseverança',
  'Promessa do Pai'
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
  timings?: Array<{ id: number; startTime: number; endTime: number }>;
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
  isBanner?: boolean;
}

export type VideoLessonCategory =
  | 'Violão'
  | 'Música'
  | 'Batidas e Ritmos'
  | 'Teoria Musical'
  | 'Dedilhado'
  | 'Cifras na Prática'
  | 'Outros';

export const VIDEO_LESSON_CATEGORIES: VideoLessonCategory[] = [
  'Violão',
  'Música',
  'Batidas e Ritmos',
  'Teoria Musical',
  'Dedilhado',
  'Cifras na Prática',
  'Outros',
];

export type VideoLessonLevel = 'Iniciante' | 'Intermediário' | 'Avançado' | 'Todos os Níveis';

export const VIDEO_LESSON_LEVELS: VideoLessonLevel[] = [
  'Todos os Níveis',
  'Iniciante',
  'Intermediário',
  'Avançado',
];

export interface VideoLesson {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  category: VideoLessonCategory;
  level?: VideoLessonLevel;
  description?: string;
  ownerId: string;
  createdAt: any;
  updatedAt?: any;
}
