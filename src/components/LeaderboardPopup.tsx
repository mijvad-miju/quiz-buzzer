import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Medal, Award, Star } from "lucide-react";

interface LeaderboardEntry {
  team_name: string;
  team_number: number;
  score: number;
  questions_answered: number;
  correct_answers: number;
  accuracy: number;
}

interface LeaderboardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
}

const LeaderboardPopup = ({ isOpen, onClose, sessionId, sessionName }: LeaderboardPopupProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchLeaderboard();
    }
  }, [isOpen, sessionId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_session_leaderboard', {
        session_uuid: sessionId
      });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 1:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 2:
        return <Award className="w-8 h-8 text-amber-600" />;
      default:
        return <Star className="w-6 h-6 text-blue-500" />;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 1:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 2:
        return "bg-gradient-to-r from-amber-400 to-amber-600";
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center mb-6">
            🏆 Session Complete! 🏆
          </DialogTitle>
          <div className="text-center text-xl text-muted-foreground mb-8">
            {sessionName} - Final Leaderboard
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No scores recorded for this session.
              </div>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={`${entry.team_name}-${index}`}
                  className={`p-6 rounded-2xl border-2 ${
                    index < 3 ? 'shadow-lg' : 'shadow-md'
                  } ${getRankColor(index)} text-white`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        <span className="text-2xl font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{entry.team_name}</div>
                        <div className="text-lg opacity-90">Team {entry.team_number}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-3xl font-bold">{entry.score}</div>
                      <div className="text-sm opacity-90">points</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-lg font-semibold">{entry.questions_answered}</div>
                      <div className="text-sm opacity-90">Questions</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-lg font-semibold">{entry.correct_answers}</div>
                      <div className="text-sm opacity-90">Correct</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-lg font-semibold">{entry.accuracy}%</div>
                      <div className="text-sm opacity-90">Accuracy</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-center mt-8">
          <Button onClick={onClose} size="lg" className="px-8">
            Continue to Next Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardPopup;
