export interface User {
  id: number;
  name: string;
  password: string;
  isAdmin: boolean;
  votes: number[];
  participationCount: number;
  badges: string[];
  balance: number;
  createdAt: string | Date;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  votes: number;
}

export interface VoteDetail {
  eventId: number;
  eventTitle: string;
  userId: number;
  userName: string;
  votedAt: string | Date;
  additionalPlayers: number;
  paid: boolean;
}

export interface Log {
  id: number;
  timestamp: string | Date;
  user: string;
  action: string;
  details: string;
}

export interface AuthForm {
  name: string;
  password: string;
  requestAdmin: boolean;
}

export interface Notification {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export interface NewEvent {
  title: string;
  description: string;
  date: string;
}
