import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Zap, Users, Trophy, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WinnerPopup from "@/components/WinnerPopup";
import ScoreboardPopup from "@/components/ScoreboardPopup";
import logoPng from "../../vibr.png";
// Footer removed per request

const Index = () => {
  const navigate = useNavigate();
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    fetchGameState();
    fetchTeams();

    // Subscribe to game state changes
    const channel = supabase
      .channel("index-game-state-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
        },
        () => {
          fetchGameState();
        }
      )
      .subscribe();

    // Subscribe to teams changes for scoreboard
    const teamsChannel = supabase
      .channel("index-teams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => fetchTeams()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(teamsChannel);
    };
  }, []);

  useEffect(() => {
    if (gameState?.quiz_ended && gameState?.winner_team_id) {
      fetchWinnerTeam(gameState.winner_team_id);
    }
  }, [gameState]);

  const fetchGameState = async () => {
    const { data, error } = await supabase
      .from("game_state")
      .select("*")
      .single();

    if (!error && data) {
      setGameState(data);
    }
  };

  const fetchWinnerTeam = async (winnerTeamId: string) => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", winnerTeamId)
        .single();

      if (!error && data) {
        setWinnerTeam(data);
        setShowWinnerPopup(true);
      }
    } catch (error) {
      console.error("Error fetching winner team:", error);
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .order("team_number");
    if (data) setTeams(data);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Check Results Button */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          onClick={() => setShowScoreboard(true)}
          size="sm"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Check Results
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center space-y-12">
          {/* Logo/Title */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-center">
              <img src={logoPng} alt="Vibranium logo" className="mx-auto max-w-[160px] w-full h-auto" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              VIBRANIUM 5.0
            </h2>
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Quiz Buzzer
            </h1>
            {/* removed subtitle per request */}
          </div>

          {/* Powered by */}
          <div className="text-center text-sm md:text-base text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">Elevates</span>
          </div>

          {/* Action Card */}
          <div className="flex justify-center animate-scale-in">
            {/* Join as Team */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <button
                onClick={() => navigate("/register")}
                className="relative w-full max-w-md bg-card border-2 border-primary rounded-2xl p-8 hover:scale-105 transition-all duration-300"
              >
                <Users className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h2 className="text-3xl font-bold mb-2">Join as Team</h2>
                <p className="text-muted-foreground">Register your team and compete!</p>
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 text-sm md:text-base text-muted-foreground">
            <div className="space-y-2">
              <Zap className="w-8 h-8 mx-auto text-primary" />
              <p>Instant Sync</p>
            </div>
            <div className="space-y-2">
              <Users className="w-8 h-8 mx-auto text-primary" />
              <p>4 Teams Max</p>
            </div>
            <div className="space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-primary" />
              <p>Live Scoring</p>
            </div>
          </div>

        </div>
      </div>
      {/* Footer removed */}
      
      {/* Winner Popup */}
      <WinnerPopup
        isOpen={showWinnerPopup}
        onClose={() => {
          setShowWinnerPopup(false);
          setWinnerTeam(null);
        }}
        winnerTeam={winnerTeam}
      />

      {/* Scoreboard Popup */}
      <ScoreboardPopup
        isOpen={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        teams={teams}
      />
    </div>
  );
};

export default Index;
