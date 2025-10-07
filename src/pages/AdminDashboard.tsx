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
import { LogOut, Zap, Trophy, Plus, Minus, RotateCcw, Unlock, Trash2, Maximize, Minimize, Upload, X, Play, Pause, ChevronLeft, ChevronRight, Save, Edit, Eye, BookOpen, Users, Flag, BarChart3 } from "lucide-react";
// Footer removed per request
import LeaderboardPopup from "@/components/LeaderboardPopup";
import WinnerPopup from "@/components/WinnerPopup";
import ScoreboardPopup from "@/components/ScoreboardPopup";

const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [question, setQuestion] = useState(() => {
    // Load question from localStorage on component mount
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_question_draft') || '';
    }
    return '';
  });
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [buzzEvents, setBuzzEvents] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Question management state
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [showQuestionManager, setShowQuestionManager] = useState(true);
  
  // Session management state
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [completedSessionName, setCompletedSessionName] = useState("");
  
  // Winner announcement state
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<any>(null);
  
  // Scoreboard state
  const [showScoreboard, setShowScoreboard] = useState(false);
  

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
    fetchSessions();

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

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("questions")
      .select("*")
      .order("created_at");
    if (data) setQuestions(data);
  };

  const handleUpdateQuestion = async () => {
    try {
      const { error } = await supabase
        .from("game_state")
        .update({ 
          current_question: question,
          image_url: imageUrl || null,
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
      
      // Reset game state completely
      await supabase
        .from("game_state")
        .update({ 
          current_question: "Welcome to the Quiz!",
          image_url: null,
          is_locked: false,
          first_buzzer_team_id: null,
          winner_team_id: null,
          quiz_ended: false
        })
        .eq("id", gameState.id);

      // Clear buzz events
      await supabase.from("buzz_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      // Reset local state
      setBuzzEvents([]);
      setImageUrl("");
      setSelectedFile(null);
      setShowWinnerPopup(false);
      setWinnerTeam(null);
      setIsQuizActive(false);
      setCurrentQuestionIndex(0);
      setIsFullscreen(false);
      
      // Refresh data
      await fetchGameState();
      await fetchTeams();
      await fetchQuestions();
      
      toast({ title: "Game reset successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      // Clear references in buzz_events first to avoid FK errors
      const { error: buzzErr } = await supabase
        .from("buzz_events")
        .delete()
        .eq("team_id", teamId);
      if (buzzErr) throw buzzErr;

      // Clear all references to this team in game_state
      const { error: gsErr } = await supabase
        .from("game_state")
        .update({ 
          first_buzzer_team_id: gameState?.first_buzzer_team_id === teamId ? null : gameState?.first_buzzer_team_id,
          winner_team_id: gameState?.winner_team_id === teamId ? null : gameState?.winner_team_id,
          is_locked: gameState?.first_buzzer_team_id === teamId ? false : gameState?.is_locked,
          quiz_ended: gameState?.winner_team_id === teamId ? false : gameState?.quiz_ended
        })
        .eq("id", gameState.id);
      if (gsErr) throw gsErr;

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

    if (!currentSession) {
      toast({
        title: "Error",
        description: "Please select a session first",
        variant: "destructive",
      });
      return;
    }

    // Check if session already has 20 questions
    const sessionQuestions = questions.filter(q => q.session_id === currentSession.id);
    if (sessionQuestions.length >= 20) {
      toast({
        title: "Session Full",
        description: "This session already has the maximum of 20 questions",
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
          session_id: currentSession.id,
          question_text: question.trim(),
          image_url: imageUrl || null,
          order_index: sessionQuestions.length + 1,
        });

      if (error) throw error;
      
      console.log('Question saved successfully with image_url:', imageUrl);

      toast({
        title: "Question saved!",
        description: "Question has been added to the session.",
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

  // Check for session completion
  useEffect(() => {
    if (currentSession && isQuizActive) {
      const interval = setInterval(checkSessionCompletion, 2000);
      return () => clearInterval(interval);
    }
  }, [currentSession, isQuizActive]);


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Session management functions
  const fetchSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("session_number", { ascending: true });
    if (data) setSessions(data);
  };

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive",
      });
      return;
    }

    try {
      const nextSessionNumber = sessions.length + 1;
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          session_name: newSessionName,
          session_number: nextSessionNumber,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;

      setSessions([...sessions, data]);
      setNewSessionName("");
      toast({
        title: "Session Created",
        description: `Session "${newSessionName}" has been created`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const activateSession = async (sessionId: string) => {
    try {
      // Deactivate all other sessions
      await supabase
        .from("sessions")
        .update({ is_active: false })
        .neq("id", sessionId);

      // Activate the selected session
      const { error } = await supabase
        .from("sessions")
        .update({ is_active: true })
        .eq("id", sessionId);

      if (error) throw error;

      // Update game state with current session
      const { error: gameStateError } = await supabase
        .from("game_state")
        .update({ current_session_id: sessionId })
        .eq("id", gameState.id);

      if (gameStateError) throw gameStateError;

      // Fetch updated sessions and questions
      await fetchSessions();
      await fetchQuestions();
      
      setCurrentSession(sessions.find(s => s.id === sessionId));
      
      toast({
        title: "Session Activated",
        description: "Session is now active",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deactivateSession = async (sessionId: string) => {
    try {
      // Deactivate the selected session
      const { error } = await supabase
        .from("sessions")
        .update({ is_active: false })
        .eq("id", sessionId);

      if (error) throw error;

      // If game_state currently points to this session, clear it
      if (gameState?.current_session_id === sessionId) {
        const { error: gsError } = await supabase
          .from("game_state")
          .update({
            current_session_id: null,
            current_question_id: null,
            current_question: null,
            image_url: null,
            session_question_index: 0,
            is_locked: false,
            first_buzzer_team_id: null,
          })
          .eq("id", gameState.id);

        if (gsError) throw gsError;
      }

      await fetchSessions();
      toast({ title: "Session Deactivated", description: "This session is no longer active." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const checkSessionCompletion = async () => {
    if (!currentSession) return;

    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("is_completed")
        .eq("id", currentSession.id)
        .single();

      if (error) throw error;

      if (data.is_completed) {
        setCompletedSessionId(currentSession.id);
        setCompletedSessionName(currentSession.session_name);
        setShowLeaderboard(true);
      }
    } catch (error: any) {
      console.error("Error checking session completion:", error);
    }
  };

  const handleEndQuiz = async () => {
    if (teams.length === 0) {
      toast({
        title: "No teams",
        description: "There are no teams to determine a winner.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the team with the highest score
      const winner = teams.reduce((prev, current) => 
        (prev.score > current.score) ? prev : current
      );

      // Check if there's a tie
      const topScore = winner.score;
      const tiedTeams = teams.filter(team => team.score === topScore);
      
      if (tiedTeams.length > 1) {
        toast({
          title: "Tie detected!",
          description: `Multiple teams have ${topScore} points. The first team registered wins.`,
        });
      }

      // Set winner in game state to broadcast to all participants
      const { error } = await supabase
        .from("game_state")
        .update({ 
          winner_team_id: winner.id,
          quiz_ended: true,
          current_question: "Quiz Ended - Check Results!"
        })
        .eq("id", gameState.id);

      if (error) throw error;

      // Show winner popup
      setWinnerTeam(winner);
      setShowWinnerPopup(true);

      toast({
        title: "Quiz Ended!",
        description: `${winner.team_name} wins with ${winner.score} points!`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Session Management */}
        <div className="bg-card border-2 border-secondary rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Session Management
            </h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowSessionManager(!showSessionManager)} 
                variant="outline" 
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showSessionManager ? "Hide" : "Show"} Sessions
              </Button>
            </div>
          </div>

          {showSessionManager && (
            <div className="space-y-4">
              {/* Create New Session */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter session name..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={createSession} disabled={!newSessionName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </div>

              {/* Current Session */}
              {currentSession && (
                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-green-800">
                        Active Session: {currentSession.session_name}
                      </div>
                      <div className="text-sm text-green-600">
                        Session #{currentSession.session_number}
                      </div>
                    </div>
                    <div className="text-sm text-green-600">
                      {questions.filter(q => q.session_id === currentSession.id).length}/20 questions
                    </div>
                  </div>
                </div>
              )}

              {/* Sessions List */}
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border-2 ${
                      session.is_active
                        ? "border-green-500 bg-green-50"
                        : session.is_completed
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{session.session_name}</h3>
                        <p className="text-sm text-gray-600">Session #{session.session_number}</p>
                        <div className="text-sm text-gray-600 mt-1">
                          {questions.filter(q => q.session_id === session.id).length}/20 questions
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {session.is_active && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Active</span>
                        )}
                        {session.is_completed && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Completed</span>
                        )}
                        <Button
                          onClick={() => navigate(`/admin/session/${session.id}`)}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    {/* Session Actions */}
                    <div className="flex gap-2 mb-4">
                      {!session.is_completed && !session.is_active && (
                        <Button
                          onClick={() => activateSession(session.id)}
                          size="sm"
                          variant="default"
                        >
                          Activate
                        </Button>
                      )}

                      {session.is_active && (
                        <>
                          <Button
                            onClick={() => deactivateSession(session.id)}
                            size="sm"
                            variant="outline"
                          >
                            Deactivate
                          </Button>

                          {questions.filter(q => q.session_id === session.id).length > 0 && (
                            <Button
                              onClick={() => startSessionQuiz(session.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Quiz
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                ))}
              </div>
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
              
              {/* Team Buzzed First Message */}
              {gameState?.is_locked && firstBuzzerTeam && (
                <div className="bg-white/10 border-2 border-white/30 rounded-2xl p-6 animate-buzz">
                  <div className="flex items-center justify-center gap-4">
                    <Zap className={`w-12 h-12 text-${TEAM_COLORS[firstBuzzerTeam.team_number - 1]}`} />
                    <div className="text-center">
                      <div className="text-3xl md:text-4xl font-bold text-white">
                        {firstBuzzerTeam.team_name} buzzed first!
                      </div>
                      <div className={`text-xl md:text-2xl text-${TEAM_COLORS[firstBuzzerTeam.team_number - 1]}`}>
                        Team {firstBuzzerTeam.team_number}
                      </div>
                    </div>
                  </div>
                  
                  {/* Unlock Button */}
                  <div className="flex justify-center mt-6">
                    <Button 
                      onClick={handleUnlock} 
                      size="lg"
                      className="bg-green-600/20 border-green-500/50 text-green-200 hover:bg-green-600/30"
                    >
                      <Unlock className="w-5 h-5 mr-2" />
                      Unlock Buzzers
                    </Button>
                  </div>
                </div>
              )}
              
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
            <div className="flex gap-2">
              <Button onClick={() => setShowScoreboard(true)} variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Check Results
              </Button>
              <Button onClick={handleEndQuiz} variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                <Flag className="w-4 h-4 mr-2" />
                End Quiz
              </Button>
              <Button onClick={handleResetGame} variant="destructive" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Game
              </Button>
            </div>
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
      {/* Footer removed */}
      
      {/* Leaderboard Popup */}
      {showLeaderboard && completedSessionId && (
        <LeaderboardPopup
          isOpen={showLeaderboard}
          onClose={() => {
            setShowLeaderboard(false);
            setCompletedSessionId(null);
            setCompletedSessionName("");
          }}
          sessionId={completedSessionId}
          sessionName={completedSessionName}
        />
      )}

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

export default AdminDashboard;
