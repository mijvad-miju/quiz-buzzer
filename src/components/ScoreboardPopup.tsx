import { Button } from "@/components/ui/button";
import { Trophy, X, Medal, Award } from "lucide-react";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

interface ScoreboardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Array<{
    id: string;
    team_name: string;
    team_number: number;
    score: number;
  }>;
}

const ScoreboardPopup = ({ isOpen, onClose, teams }: ScoreboardPopupProps) => {
  if (!isOpen) return null;

  // Sort teams by score (highest first)
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 text-center text-muted-foreground font-bold">{index + 1}</span>;
    }
  };

  const getRankText = (index: number) => {
    switch (index) {
      case 0:
        return "1st Place";
      case 1:
        return "2nd Place";
      case 2:
        return "3rd Place";
      default:
        return `${index + 1}th Place`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card border-4 border-primary rounded-3xl p-8 max-w-2xl w-full text-center relative">
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Header */}
        <div className="space-y-4 mb-8">
          <Trophy className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold text-primary">Scoreboard</h1>
          <p className="text-muted-foreground">Current Team Standings</p>
        </div>

        {/* Teams List */}
        <div className="space-y-4 mb-8">
          {sortedTeams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">No teams registered yet</p>
            </div>
          ) : (
            sortedTeams.map((team, index) => {
              const teamColor = TEAM_COLORS[team.team_number - 1];
              const isTopThree = index < 3;
              
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                    isTopThree 
                      ? `border-${teamColor} bg-${teamColor}/10` 
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <span className="text-sm font-medium text-muted-foreground">
                        {getRankText(index)}
                      </span>
                    </div>
                    
                    <div className="text-left">
                      <div className={`text-xl font-bold text-${teamColor}`}>
                        {team.team_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Team {team.team_number}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {team.score}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {team.score === 1 ? 'point' : 'points'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <Button
          onClick={onClose}
          size="lg"
          className="w-full"
        >
          Close Scoreboard
        </Button>
      </div>
    </div>
  );
};

export default ScoreboardPopup;
