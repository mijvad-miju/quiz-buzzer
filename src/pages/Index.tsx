import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Zap, Users, Trophy } from "lucide-react";
import Footer from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center space-y-12">
          {/* Logo/Title */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-center">
              <Zap className="w-24 h-24 text-primary animate-pulse-glow" />
            </div>
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Quiz Buzzer
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Real-time competitive quiz platform
            </p>
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
      <Footer />
    </div>
  );
};

export default Index;
