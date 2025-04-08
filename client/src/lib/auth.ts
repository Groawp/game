import { User, AuthForm } from './types';
import { apiRequest } from './queryClient';

export async function login(auth: AuthForm): Promise<User> {
  return await apiRequest<User>('POST', '/api/login', {
    name: auth.name,
    password: auth.password,
  });
}

export async function register(auth: AuthForm): Promise<User> {
  return await apiRequest<User>('POST', '/api/users', {
    name: auth.name,
    password: auth.password,
    isAdmin: auth.requestAdmin,
    votes: [],
  });
}

export function saveUser(user: User): void {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

export function getUser(): User | null {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

export function removeUser(): void {
  localStorage.removeItem('currentUser');
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

export function isAdmin(): boolean {
  const user = getUser();
  return user !== null && user.isAdmin;
}
