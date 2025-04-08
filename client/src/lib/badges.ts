// Badges system for user achievements

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredParticipation: number;
  color: string;
}

// Badge definitions
export const BADGES: Badge[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    description: 'Participated in your first badminton event',
    icon: '🏸',
    requiredParticipation: 1,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'regular',
    name: 'Regular Player',
    description: 'Participated in 5 badminton events',
    icon: '🏆',
    requiredParticipation: 5,
    color: 'bg-green-100 text-green-800',
  },
  {
    id: 'enthusiast',
    name: 'Badminton Enthusiast',
    description: 'Participated in 10 badminton events',
    icon: '⭐',
    requiredParticipation: 10,
    color: 'bg-yellow-100 text-yellow-800',
  },
  {
    id: 'pro',
    name: 'Badminton Pro',
    description: 'Participated in 20 badminton events',
    icon: '🥇',
    requiredParticipation: 20,
    color: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'legend',
    name: 'Badminton Legend',
    description: 'Participated in 50 badminton events',
    icon: '👑',
    requiredParticipation: 50,
    color: 'bg-red-100 text-red-800',
  },
];

// Helper function to determine which badges a user has earned
export function getEarnedBadges(participationCount: number): Badge[] {
  return BADGES.filter(badge => participationCount >= badge.requiredParticipation);
}

// Helper function to get the next badge a user can earn
export function getNextBadge(participationCount: number): Badge | null {
  const nextBadge = BADGES.find(badge => participationCount < badge.requiredParticipation);
  return nextBadge || null;
}

// Helper function to calculate progress toward next badge
export function getProgressToNextBadge(participationCount: number): number {
  const nextBadge = getNextBadge(participationCount);
  if (!nextBadge) return 100; // Already earned all badges
  
  // Find the previous badge (or start from 0)
  const badgeIndex = BADGES.findIndex(badge => badge.id === nextBadge.id);
  const prevRequirement = badgeIndex > 0 ? BADGES[badgeIndex - 1].requiredParticipation : 0;
  
  // Calculate progress percentage
  const progress = ((participationCount - prevRequirement) / 
                   (nextBadge.requiredParticipation - prevRequirement)) * 100;
  
  return Math.min(Math.max(0, progress), 99); // Cap between 0-99%
}