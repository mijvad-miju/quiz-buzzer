import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

const BuzzerPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { teamId, teamName, teamNumber } = location.state || {};

  const [gameState, setGameState] = useState<any>(null);
  const [canBuzz, setCanBuzz] = useState(true);
  const [buzzed, setBuzzed] = useState(false);

  useEffect(() => {
    if (!teamId) {
      navigate("/register");
      return;
    }

    fetchGameState();

    // Subscribe to game state changes
    const channel = supabase
      .channel("game-state-changes")
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, navigate]);

  useEffect(() => {
    if (gameState) {
      setCanBuzz(!gameState.is_locked);
      // Reset buzzed state when game is unlocked
      if (!gameState.is_locked) {
        setBuzzed(false);
      }
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

  const handleBuzz = async () => {
    if (!canBuzz || buzzed) return;

    // Play buzz sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440;
    oscillator.type = "square";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 200);

    setBuzzed(true);

    try {
      // Insert buzz event
      const { error } = await supabase
        .from("buzz_events")
        .insert({
          team_id: teamId,
        });

      if (error) throw error;

      // Lock the game state
      const { error: updateError } = await supabase
        .from("game_state")
        .update({
          is_locked: true,
          first_buzzer_team_id: teamId,
        })
        .eq("id", gameState.id);

      if (updateError) throw updateError;

      toast({
        title: "Buzzed!",
        description: "Waiting for admin response...",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setBuzzed(false);
    }
  };

  const teamColor = TEAM_COLORS[teamNumber - 1];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <Button
          variant="ghost"
          onClick={() => navigate("/register")}
          className="absolute top-4 left-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Game
        </Button>

        <div className="w-full max-w-2xl space-y-8">
          {/* Team Info */}
          <div className="text-center space-y-4">
            <div className={`text-6xl font-bold text-${teamColor}`}>
              {teamName}
            </div>
            
            {/* Question Image */}
            {gameState?.image_url && (
              <div className="flex justify-center mb-4">
                <img 
                  src={gameState.image_url} 
                  alt="Question image" 
                  className="max-w-full max-h-64 object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error('Image failed to load in BuzzerPage:', gameState.image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully in BuzzerPage:', gameState.image_url);
                  }}
                />
              </div>
            )}
            
            {/* Question Text */}
            <div className="text-xl text-muted-foreground">
              {gameState?.current_question || "Waiting for question..."}
            </div>
          </div>

          {/* Buzzer Button */}
          <div className="flex justify-center">
            <button
              onClick={handleBuzz}
              disabled={!canBuzz || buzzed}
              className={`relative w-72 h-72 rounded-full border-8 transition-all duration-300 ${
                !canBuzz || buzzed
                  ? "opacity-50 cursor-not-allowed border-muted"
                  : `border-${teamColor} hover:scale-110 active:scale-95 glow-${teamColor}`
              } ${buzzed ? "animate-buzz" : ""}`}
              style={{
                background: `radial-gradient(circle, hsl(var(--${teamColor}) / 0.3), hsl(var(--${teamColor}) / 0.1))`,
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Zap className={`w-24 h-24 text-${teamColor} ${!canBuzz || buzzed ? "" : "animate-pulse-glow"}`} />
                <div className={`text-2xl font-bold text-${teamColor} mt-4`}>
                  {buzzed ? "BUZZED!" : canBuzz ? "BUZZ" : "LOCKED"}
                </div>
              </div>
            </button>
          </div>

          {/* Status */}
          <div className="text-center">
            {gameState?.is_locked && (
              <div className="text-lg text-muted-foreground">
                Game is locked. Waiting for admin to unlock...
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BuzzerPage;
