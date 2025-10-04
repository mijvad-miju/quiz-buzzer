import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut, Zap, Trophy, Plus, Minus, RotateCcw, Unlock, Trash2, Maximize, Minimize, Upload, X, Play, Pause, ChevronLeft, ChevronRight, Save, Edit, Eye, BookOpen } from "lucide-react";
import Footer from "@/components/Footer";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [buzzEvents, setBuzzEvents] = useState<any[]>([]);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/admin/login");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/admin/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Save question to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_question_draft', question);
    }
  }, [question]);

  useEffect(() => {
    if (!user) return;

    fetchGameState();
    fetchTeams();
    fetchQuestions();

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
      setImageUrl(data.image_url || "");
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .order("team_number");
    if (data) setTeams(data);
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
          image_url: null,
          is_locked: false,
          first_buzzer_team_id: null
        })
        .eq("id", gameState.id);

      // Clear buzz events
      await supabase.from("buzz_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      setBuzzEvents([]);
      setImageUrl("");
      setSelectedFile(null);
      toast({ title: "Game reset successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      toast({ 
        title: "Team Deleted", 
        description: `${teamName} has been removed from the game.` 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      setImageUrl(""); // Clear URL input when file is selected
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Create unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, selectedFile);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      setSelectedFile(null);
      
      toast({
        title: "Image uploaded successfully!",
        description: `Image is ready to be used with your question. URL: ${publicUrl}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setSelectedFile(null);
  };

  const saveQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Saving question:', question.trim());
      console.log('Saving image_url:', imageUrl);
      
      const { error } = await supabase
        .from("questions")
        .insert({
          question_text: question.trim(),
          image_url: imageUrl || null,
        });

      if (error) throw error;
      
      console.log('Question saved successfully with image_url:', imageUrl);

      toast({
        title: "Question saved!",
        description: "Question has been added to your quiz.",
      });

      // Clear form
      setQuestion("");
      setImageUrl("");
      setSelectedFile(null);
      
      // Clear localStorage draft
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_question_draft');
      }
      
      // Refresh questions
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startQuiz = async () => {
    if (questions.length === 0) {
      toast({
        title: "No questions",
        description: "Please add at least one question before starting the quiz.",
        variant: "destructive",
      });
      return;
    }

    setIsQuizActive(true);
    setCurrentQuestionIndex(0);
    
    // Display first question
    const firstQuestion = questions[0];
    await displayQuestion(firstQuestion);
    
    // Automatically go fullscreen when quiz starts
    setIsFullscreen(true);
    
    toast({
      title: "Quiz started!",
      description: "The quiz is now active and displayed in fullscreen. Use the navigation controls to move between questions.",
    });
  };

  const displayQuestion = async (questionData: any) => {
    try {
      console.log('Displaying question:', questionData);
      console.log('Question image_url:', questionData.image_url);
      
      const { error } = await supabase
        .from("game_state")
        .update({
          current_question: questionData.question_text,
          image_url: questionData.image_url || null,
          is_locked: false,
          first_buzzer_team_id: null,
        })
        .eq("id", gameState.id);

      if (error) throw error;

      // Clear buzz events
      await supabase.from("buzz_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      setBuzzEvents([]);

      console.log('Question displayed successfully with image_url:', questionData.image_url);

      toast({
        title: "Question displayed!",
        description: "Question is now visible to all participants.",
      });
    } catch (error: any) {
      console.error('Error displaying question:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      await displayQuestion(questions[nextIndex]);
      setIsFullscreen(true); // Auto fullscreen when navigating
    }
  };

  const previousQuestion = async () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      await displayQuestion(questions[prevIndex]);
      setIsFullscreen(true); // Auto fullscreen when navigating
    }
  };

  const endQuiz = () => {
    setIsQuizActive(false);
    setCurrentQuestionIndex(0);
    toast({
      title: "Quiz ended",
      description: "The quiz has been ended.",
    });
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast({
        title: "Question deleted",
        description: "Question has been removed from your quiz.",
      });

      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const firstBuzzerTeam = teams.find((t) => t.id === gameState?.first_buzzer_team_id);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/questions")} className="bg-primary">
              <BookOpen className="w-4 h-4 mr-2" />
              Questions
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Enter question..."
                className="flex-1"
              />
              <Button onClick={saveQuestion} className="px-8">
                <Save className="w-4 h-4 mr-2" />
                Save Question
              </Button>
            </div>
            <div className="space-y-4">
              {/* Image Upload Section */}
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Add Image (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </label>
                    {selectedFile && (
                      <Button
                        onClick={uploadImage}
                        disabled={uploading}
                        size="sm"
                        className="px-4"
                      >
                        {uploading ? "Uploading..." : "Upload"}
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                
                {/* Image Preview */}
                {(imageUrl || selectedFile) && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={imageUrl || (selectedFile ? URL.createObjectURL(selectedFile) : '')} 
                      alt="Question preview" 
                      className="w-16 h-16 object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Button
                      onClick={clearImage}
                      variant="outline"
                      size="sm"
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Alternative: Image URL Input */}
              <div className="flex gap-4">
                <Input
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setSelectedFile(null); // Clear file when URL is entered
                  }}
                  placeholder="Or enter image URL directly..."
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Quiz Controls */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                {!isQuizActive ? (
                  <Button onClick={startQuiz} className="px-6">
                    <Play className="w-4 h-4 mr-2" />
                    Start Quiz
                  </Button>
                ) : (
                  <>
                    <Button onClick={endQuiz} variant="destructive" className="px-6">
                      <Pause className="w-4 h-4 mr-2" />
                      End Quiz
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={previousQuestion} 
                        disabled={currentQuestionIndex === 0}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <Button 
                        onClick={nextQuestion} 
                        disabled={currentQuestionIndex === questions.length - 1}
                        variant="outline"
                        size="sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {questions.length} questions saved
              </div>
            </div>
          </div>

          {/* Question List */}
          {showQuestionManager && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Saved Questions</h3>
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No questions saved yet. Add your first question above!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {questions.map((q, index) => (
                    <div 
                      key={q.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        currentQuestionIndex === index && isQuizActive 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                          <span className="text-sm">{q.question_text}</span>
                          {q.image_url && (
                            <span className="text-xs text-muted-foreground">📷</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => displayQuestion(q)}
                          variant="outline"
                          size="sm"
                          className="px-2"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="px-2">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Question</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this question? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteQuestion(q.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Question
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fullscreen Question Display */}
        {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-8">
            <div className="text-center space-y-8 max-w-6xl w-full">
              {/* Image Display */}
              {gameState?.image_url && (
                <div className="flex justify-center mb-8">
                  <img 
                    src={gameState.image_url} 
                    alt="Question image" 
                    className="max-w-full max-h-96 object-contain rounded-lg shadow-2xl"
                    onError={(e) => {
                      console.error('Image failed to load:', gameState.image_url);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', gameState.image_url);
                    }}
                  />
                </div>
              )}
              
              {/* Question Text */}
              <div className="text-white text-4xl md:text-6xl lg:text-8xl font-bold leading-tight">
                {gameState?.current_question || "No question set"}
              </div>
              
              {/* Navigation Controls */}
              {isQuizActive && questions.length > 1 && (
                <div className="flex justify-center items-center gap-8">
                  <Button 
                    onClick={previousQuestion}
                    disabled={currentQuestionIndex === 0}
                    variant="outline" 
                    size="lg"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-6 h-6 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="text-white text-xl font-semibold px-6 py-2 bg-white/10 rounded-lg">
                    {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  
                  <Button 
                    onClick={nextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    variant="outline" 
                    size="lg"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-6 h-6 ml-2" />
                  </Button>
                </div>
              )}
              
              {/* Control Buttons */}
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={toggleFullscreen} 
                  variant="outline" 
                  size="lg"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Minimize className="w-5 h-5 mr-2" />
                  Exit Fullscreen
                </Button>
                
                {isQuizActive && (
                  <Button 
                    onClick={endQuiz} 
                    variant="destructive" 
                    size="lg"
                    className="bg-red-600/20 border-red-500/50 text-red-200 hover:bg-red-600/30"
                  >
                    <Pause className="w-5 h-5 mr-2" />
                    End Quiz
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="px-3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Team</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{team.team_name}</strong>? 
                            This action cannot be undone and will remove the team from the game.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeam(team.id, team.team_name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Team
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
