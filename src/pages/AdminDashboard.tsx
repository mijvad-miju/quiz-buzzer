import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Zap, Trophy, Plus, Minus, RotateCcw, Unlock } from "lucide-react";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [buzzEvents, setBuzzEvents] = useState<any[]>([]);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    fetchGameState();
    fetchTeams();

    // Subscribe to real-time updates
    const gameChannel = supabase
      .channel("admin-game-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        () => fetchGameState()
      )
      .subscribe();

    const teamsChannel = supabase
      .channel("admin-teams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => fetchTeams()
      )
      .subscribe();

    const buzzChannel = supabase
      .channel("admin-buzz-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "buzz_events" },
        (payload) => {
          setBuzzEvents((prev) => [payload.new, ...prev]);
          // Play notification sound
          const audio = new Audio();
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 880;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          
          oscillator.start();
          setTimeout(() => oscillator.stop(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(buzzChannel);
    };
  }, [user]);

  const fetchGameState = async () => {
    const { data } = await supabase.from("game_state").select("*").single();
    if (data) {
      setGameState(data);
      setQuestion(data.current_question || "");
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .order("team_number");
    if (data) setTeams(data);
  };

  const handleUpdateQuestion = async () => {
    try {
      const { error } = await supabase
        .from("game_state")
        .update({ 
          current_question: question,
          is_locked: false,
          first_buzzer_team_id: null
        })
        .eq("id", gameState.id);

      if (error) throw error;

      // Clear buzz events
      await supabase.from("buzz_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      setBuzzEvents([]);

      toast({ title: "Question updated and buzzers reset!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUnlock = async () => {
    try {
      const { error } = await supabase
        .from("game_state")
        .update({ is_locked: false, first_buzzer_team_id: null })
        .eq("id", gameState.id);

      if (error) throw error;

      toast({ title: "Buzzers unlocked!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleScoreChange = async (teamId: string, change: number) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    try {
      const { error } = await supabase
        .from("teams")
        .update({ score: Math.max(0, team.score + change) })
        .eq("id", teamId);

      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleResetGame = async () => {
    try {
      // Delete all teams
      await supabase.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      // Reset game state
      await supabase
        .from("game_state")
        .update({ 
          current_question: "Welcome to the Quiz!",
          is_locked: false,
          first_buzzer_team_id: null
        })
        .eq("id", gameState.id);

      // Clear buzz events
      await supabase.from("buzz_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      setBuzzEvents([]);
      toast({ title: "Game reset successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const firstBuzzerTeam = teams.find((t) => t.id === gameState?.first_buzzer_team_id);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Question Control */}
        <div className="bg-card border-2 border-primary rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold">Question Control</h2>
          <div className="flex gap-4">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter question..."
              className="flex-1"
            />
            <Button onClick={handleUpdateQuestion} className="px-8">
              Next Question
            </Button>
          </div>
        </div>

        {/* Buzz Status */}
        {gameState?.is_locked && firstBuzzerTeam && (
          <div className="bg-card border-2 border-accent rounded-2xl p-6 animate-buzz">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Zap className={`w-12 h-12 text-${TEAM_COLORS[firstBuzzerTeam.team_number - 1]}`} />
                <div>
                  <div className="text-3xl font-bold">{firstBuzzerTeam.team_name} buzzed first!</div>
                  <div className={`text-lg text-${TEAM_COLORS[firstBuzzerTeam.team_number - 1]}`}>
                    Team {firstBuzzerTeam.team_number}
                  </div>
                </div>
              </div>
              <Button onClick={handleUnlock} size="lg">
                <Unlock className="w-4 h-4 mr-2" />
                Unlock
              </Button>
            </div>
          </div>
        )}

        {/* Teams & Scores */}
        <div className="bg-card border-2 border-secondary rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              Teams & Scores
            </h2>
            <Button onClick={handleResetGame} variant="destructive" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Game
            </Button>
          </div>

          {teams.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No teams registered yet
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`border-2 border-${TEAM_COLORS[team.team_number - 1]} rounded-xl p-4`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className={`text-xl font-bold text-${TEAM_COLORS[team.team_number - 1]}`}>
                        {team.team_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Team {team.team_number}
                      </div>
                    </div>
                    <div className="text-3xl font-bold">{team.score}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleScoreChange(team.id, 1)}
                      size="sm"
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleScoreChange(team.id, -1)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
