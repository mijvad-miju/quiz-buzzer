import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, X } from "lucide-react";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

interface WinnerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  winnerTeam: {
    team_name: string;
    team_number: number;
    score: number;
  } | null;
}

const WinnerPopup = ({ isOpen, onClose, winnerTeam }: WinnerPopupProps) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen && winnerTeam) {
      setShowConfetti(true);
      // Auto close after 10 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, winnerTeam, onClose]);

  if (!isOpen || !winnerTeam) return null;

  const teamColor = TEAM_COLORS[winnerTeam.team_number - 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card border-4 border-yellow-400 rounded-3xl p-8 max-w-2xl w-full text-center relative overflow-hidden">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 bg-yellow-400 animate-bounce`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Winner Content */}
        <div className="relative z-10 space-y-6">
          {/* Trophy Icon */}
          <div className="flex justify-center">
            <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
          </div>

          {/* Winner Announcement */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-yellow-400 animate-pulse">
              🎉 WINNER! 🎉
            </h1>
            
            <div className={`text-3xl md:text-5xl font-bold text-${teamColor} animate-pulse`}>
              {winnerTeam.team_name}
            </div>
            
            <div className="text-xl md:text-2xl text-muted-foreground">
              Team {winnerTeam.team_number}
            </div>
            
            <div className="text-2xl md:text-4xl font-bold text-yellow-400">
              Final Score: {winnerTeam.score} points
            </div>
          </div>

          {/* Congratulations Message */}
          <div className="text-lg md:text-xl text-muted-foreground">
            Congratulations on winning the quiz! 🏆
          </div>

          {/* Close Button */}
          <Button
            onClick={onClose}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WinnerPopup;
