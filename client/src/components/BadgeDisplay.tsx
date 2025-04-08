import { Badge, type Badge as BadgeType, getEarnedBadges, getNextBadge, getProgressToNextBadge } from "@/lib/badges";
import { User } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface BadgeDisplayProps {
  user: User;
  compact?: boolean;
}

export function BadgeDisplay({ user, compact = false }: BadgeDisplayProps) {
  const earnedBadges = getEarnedBadges(user.participationCount || 0);
  const nextBadge = getNextBadge(user.participationCount || 0);
  const progressPercentage = getProgressToNextBadge(user.participationCount || 0);
  
  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {earnedBadges.length > 0 ? (
          <div className="flex -space-x-2">
            {earnedBadges.slice(0, 3).map((badge, index) => (
              <TooltipProvider key={badge.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.color} text-lg border border-white z-${10 - index}`}
                    >
                      {badge.icon}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-bold">{badge.name}</p>
                      <p>{badge.description}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {earnedBadges.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium border border-white">
                +{earnedBadges.length - 3}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-500">No badges yet</span>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Your Badges</h3>
          <span className="text-sm text-gray-500">{user.participationCount || 0} participations</span>
        </div>
        
        {earnedBadges.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {earnedBadges.map((badge) => (
              <motion.div
                key={badge.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <BadgeItem badge={badge} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>You haven't earned any badges yet.</p>
            <p className="text-sm">Join events to earn your first badge!</p>
          </div>
        )}
      </div>
      
      {nextBadge && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium">Next badge: {nextBadge.name}</h4>
            <span className="text-xs text-gray-500">{progressPercentage.toFixed(0)}% complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-gray-600">{nextBadge.description}</p>
        </div>
      )}
    </div>
  );
}

function BadgeItem({ badge }: { badge: BadgeType }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <UIBadge
            variant="outline"
            className={`h-10 px-3 py-2 text-base ${badge.color} hover:${badge.color.replace('bg-', 'bg-opacity-80')} cursor-pointer transition-all`}
          >
            <span className="mr-1">{badge.icon}</span>
            {badge.name}
          </UIBadge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{badge.description}</p>
          <p className="text-xs text-gray-500 mt-1">Requires {badge.requiredParticipation} participations</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}