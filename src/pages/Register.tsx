import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users } from "lucide-react";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];
const TEAM_LABELS = ["Team 1 (Red)", "Team 2 (Blue)", "Team 3 (Green)", "Team 4 (Yellow)"];

const Register = () => {
  const [teamName, setTeamName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();

    // Subscribe to team changes
    const channel = supabase
      .channel("teams-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("team_number");

    if (!error && data) {
      setTeams(data);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam || !teamName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a team name and select a slot",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("teams")
        .insert({
          team_number: selectedTeam,
          team_name: teamName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${teamName} registered as ${TEAM_LABELS[selectedTeam - 1]}`,
      });

      // Navigate to buzzer page with team info
      navigate("/buzzer", { state: { teamId: data.id, teamName, teamNumber: selectedTeam } });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to register team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isTeamTaken = (teamNumber: number) => {
    return teams.some((t) => t.team_number === teamNumber);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="bg-card border-2 border-primary rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <Users className="w-12 h-12 mx-auto text-primary" />
            <h1 className="text-4xl font-bold">Team Registration</h1>
            <p className="text-muted-foreground">Choose your slot and enter your team name</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                type="text"
                placeholder="Enter your team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Select Team Slot</Label>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => {
                  const taken = isTeamTaken(num);
                  const team = teams.find((t) => t.team_number === num);
                  
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => !taken && setSelectedTeam(num)}
                      disabled={taken}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
                        selectedTeam === num
                          ? `border-${TEAM_COLORS[num - 1]} bg-${TEAM_COLORS[num - 1]}/20 scale-105`
                          : taken
                          ? "border-muted bg-muted/20 opacity-50 cursor-not-allowed"
                          : `border-${TEAM_COLORS[num - 1]}/50 hover:border-${TEAM_COLORS[num - 1]} hover:scale-105`
                      }`}
                    >
                      <div className={`text-lg font-bold text-${TEAM_COLORS[num - 1]}`}>
                        {TEAM_LABELS[num - 1]}
                      </div>
                      {taken && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Taken by {team?.team_name}
                        </div>
                      )}
                      {!taken && (
                        <div className="text-sm text-muted-foreground mt-1">Available</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full text-lg py-6"
              disabled={loading || !selectedTeam}
            >
              {loading ? "Registering..." : "Register & Join Game"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
