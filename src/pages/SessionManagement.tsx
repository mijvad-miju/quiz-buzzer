import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Upload, 
  X, 
  Edit, 
  Eye,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  Pause,
  Zap,
  Unlock
} from "lucide-react";
import WinnerPopup from "@/components/WinnerPopup";
// Footer removed per request

const SessionManagement = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Session state
  const [session, setSession] = useState<any>(null);
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Question management state
  const [questionText, setQuestionText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  
  // Quiz state
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameState, setGameState] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [recentBuzzTeam, setRecentBuzzTeam] = useState<any | null>(null);
  const recentBuzzTimerRef = useRef<number | null>(null);

  // Winner popup state
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<any>(null);

  const TEAM_COLORS = ["team-1", "team-2", "team-3", "team-4"];

  useEffect(() => {
    if (sessionId) {
      fetchSession();
      fetchSessionQuestions();
      fetchGameState();
      fetchTeams();
    }
  }, [sessionId]);

  // Winner detection for fullscreen: prefer winner_team_id; fallback to top-score when quiz ended message is set
  useEffect(() => {
    if (gameState && isFullscreen) {
      const winnerId = (gameState as any).winner_team_id as string | undefined;
      if (winnerId) {
        const found = teams.find(t => t.id === winnerId);
        if (found) {
          setWinnerTeam(found);
          setShowWinnerPopup(true);
          return;
        }
      }
      if (gameState.current_question === "Quiz Ended - Check Results!" && teams.length > 0) {
        const top = [...teams].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
        if (top) {
          setWinnerTeam(top);
          setShowWinnerPopup(true);
        }
      }
    }
  }, [gameState, teams, isFullscreen]);

  // Realtime subscribe to game_state so buzz lock updates appear in fullscreen
  useEffect(() => {
    const channel = supabase
      .channel("session-game-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state" },
        () => {
          fetchGameState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime: transient banner for ANY buzz event (ensure single subscription)
  useEffect(() => {
    const buzzChannel = supabase
      .channel(`session-buzz-events-${sessionId ?? 'global'}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "buzz_events" },
        (payload) => {
          const buzz = payload.new as { team_id: string };
          const team = teams.find((t) => t.id === buzz.team_id);
          if (team) {
            setRecentBuzzTeam(team);
            if (recentBuzzTimerRef.current) window.clearTimeout(recentBuzzTimerRef.current);
            recentBuzzTimerRef.current = window.setTimeout(() => setRecentBuzzTeam(null), 2500) as unknown as number;
          }
        }
      )
      .subscribe();

    return () => {
      if (recentBuzzTimerRef.current) window.clearTimeout(recentBuzzTimerRef.current);
      supabase.removeChannel(buzzChannel);
    };
  }, [sessionId, teams]);

  // Keyboard navigation for fullscreen quiz
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFullscreen && isQuizActive) {
        switch (event.key) {
          case 'ArrowLeft':
            if (currentQuestionIndex > 0) {
              previousQuestion();
            }
            break;
          case 'ArrowRight':
            if (currentQuestionIndex < sessionQuestions.length - 1) {
              nextQuestion();
            }
            break;
          case 'Escape':
            setIsFullscreen(false);
            break;
          case ' ':
            event.preventDefault();
            if (isQuizActive) {
              endQuiz();
            } else {
              startQuiz();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isQuizActive, currentQuestionIndex, sessionQuestions.length]);

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch session",
        variant: "destructive",
      });
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", sessionId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setSessionQuestions(data || []);
    } catch (error: any) {
      console.error("Error fetching session questions:", error);
    }
  };

  const fetchGameState = async () => {
    try {
      const { data, error } = await supabase
        .from("game_state")
        .select("*")
        .single();

      if (error) throw error;
      setGameState(data);
    } catch (error: any) {
      console.error("Error fetching game state:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("team_number", { ascending: true });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error("Error fetching teams:", error);
    }
  };

  const firstBuzzerTeam = teams.find((t) => t.id === gameState?.first_buzzer_team_id);

  const handleUnlock = async () => {
    try {
      const { error } = await supabase
        .from("game_state")
        .update({ is_locked: false, first_buzzer_team_id: null })
        .eq("id", gameState.id);

      if (error) throw error;

      await fetchGameState();
      toast({ title: "Unlocked", description: "Buzzers are unlocked." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImageUrl(""); // Clear URL when file is selected
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const { data, error } = await supabase.storage
        .from("question-images")
        .upload(`${Date.now()}-${selectedFile.name}`, selectedFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("question-images")
        .getPublicUrl(data.path);

      setImageUrl(publicUrl);
      setSelectedFile(null);
      
      toast({
        title: "Image Uploaded",
        description: "Image has been uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
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
    if (!questionText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    if (sessionQuestions.length >= 20) {
      toast({
        title: "Session Full",
        description: "This session already has the maximum of 20 questions",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build question data with required fields
      const questionData: any = {
        session_id: sessionId,
        question_text: questionText.trim(),
        image_url: imageUrl || null,
      };

      // Add optional fields if they exist in the schema
      questionData.order_index = sessionQuestions.length + 1;
      questionData.is_active = false;

      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from("questions")
          .update(questionData)
          .eq("id", editingQuestion.id);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        setSessionQuestions(sessionQuestions.map(q => 
          q.id === editingQuestion.id ? { ...q, ...questionData } : q
        ));

        toast({
          title: "Question Updated",
          description: "Question has been updated successfully",
        });
      } else {
        // Create new question
        const { data, error } = await supabase
          .from("questions")
          .insert(questionData)
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }

        setSessionQuestions([...sessionQuestions, data]);
        toast({
          title: "Question Added",
          description: "Question has been added to the session",
        });
      }

      // Clear form
      setQuestionText("");
      setImageUrl("");
      setSelectedFile(null);
      setEditingQuestion(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editQuestion = (question: any) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setImageUrl(question.image_url || "");
    setSelectedFile(null);
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      // If the question is currently referenced in game_state, clear or move to a neighbor
      if (gameState?.current_question_id === questionId) {
        // Prefer next question, otherwise previous, otherwise clear
        const idx = sessionQuestions.findIndex((q) => q.id === questionId);
        const next = idx >= 0 && idx < sessionQuestions.length - 1 ? sessionQuestions[idx + 1] : null;
        const prev = idx > 0 ? sessionQuestions[idx - 1] : null;

        if (next) {
          const { error: gsErr } = await supabase
            .from("game_state")
            .update({
              current_question_id: next.id,
              current_question: next.question_text,
              image_url: next.image_url,
              session_question_index: idx, // next takes current index
              is_locked: false,
              first_buzzer_team_id: null,
            })
            .eq("id", gameState.id);
          if (gsErr) throw gsErr;
          setCurrentQuestionIndex(idx); // keep the pointer at the same position now showing next
        } else if (prev) {
          const { error: gsErr } = await supabase
            .from("game_state")
            .update({
              current_question_id: prev.id,
              current_question: prev.question_text,
              image_url: prev.image_url,
              session_question_index: idx - 1,
              is_locked: false,
              first_buzzer_team_id: null,
            })
            .eq("id", gameState.id);
          if (gsErr) throw gsErr;
          setCurrentQuestionIndex(Math.max(0, idx - 1));
        } else {
          const { error: gsErr } = await supabase
            .from("game_state")
            .update({
              current_session_id: sessionId,
              current_question_id: null,
              current_question: null,
              image_url: null,
              session_question_index: 0,
              is_locked: false,
              first_buzzer_team_id: null,
            })
            .eq("id", gameState.id);
          if (gsErr) throw gsErr;
          setCurrentQuestionIndex(0);
        }
      }

      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);
      if (error) throw error;

      // Refresh list from DB to maintain order indexes
      await fetchSessionQuestions();

      toast({
        title: "Question Deleted",
        description: "Question has been removed from the session",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startQuiz = async () => {
    if (sessionQuestions.length === 0) {
      toast({
        title: "No Questions",
        description: "Please add questions to the session before starting the quiz",
        variant: "destructive",
      });
      return;
    }

    try {
      // Activate session
      await supabase
        .from("sessions")
        .update({ is_active: true })
        .eq("id", sessionId);

      // Deactivate other sessions
      await supabase
        .from("sessions")
        .update({ is_active: false })
        .neq("id", sessionId);

      // Ensure the session exists to satisfy FK
      const { data: ensuredSession } = await supabase
        .from("sessions")
        .select("id")
        .eq("id", sessionId as string)
        .single();

      if (!ensuredSession) {
        toast({
          title: "Session not found",
          description: "Please create or select a valid session.",
          variant: "destructive",
        });
        return;
      }

      // Start quiz with first question
      const firstQuestion = sessionQuestions[0];
      const { error } = await supabase
        .from("game_state")
        .update({
          current_session_id: ensuredSession.id,
          current_question_id: firstQuestion.id,
          current_question: firstQuestion.question_text,
          image_url: firstQuestion.image_url,
          session_question_index: 0,
          is_locked: false,
          first_buzzer_team_id: null,
        })
        .eq("id", gameState.id);

      if (error) throw error;

      setIsQuizActive(true);
      setCurrentQuestionIndex(0);
      setIsFullscreen(true); // Automatically go fullscreen when quiz starts
      
      toast({
        title: "Quiz Started",
        description: `Quiz for "${session?.session_name}" has started in fullscreen`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const endQuiz = async () => {
    try {
      const { error } = await supabase
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

      if (error) throw error;

      setIsQuizActive(false);
      setCurrentQuestionIndex(0);
      setIsFullscreen(false);
      
      toast({
        title: "Quiz Ended",
        description: "Quiz has been ended",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSession = async () => {
    try {
      // First delete all questions in the session
      const { error: questionsError } = await supabase
        .from("questions")
        .delete()
        .eq("session_id", sessionId);

      if (questionsError) throw questionsError;

      // Clear game_state references if they point to this session
      const { error: clearGsError } = await supabase
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
        .eq("current_session_id", sessionId as string);

      if (clearGsError) throw clearGsError;

      // Then delete the session
      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      toast({
        title: "Session Deleted",
        description: "Session and all its questions have been deleted",
      });

      // Navigate back to admin dashboard
      navigate("/admin");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = sessionQuestions[nextIndex];
      
      const { error } = await supabase
        .from("game_state")
        .update({
          current_question_id: nextQuestion.id,
          current_question: nextQuestion.question_text,
          image_url: nextQuestion.image_url,
          session_question_index: nextIndex,
          is_locked: false,
          first_buzzer_team_id: null,
        })
        .eq("id", gameState.id);

      if (error) throw error;

      setCurrentQuestionIndex(nextIndex);
    }
  };

  const previousQuestion = async () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      const prevQuestion = sessionQuestions[prevIndex];
      
      const { error } = await supabase
        .from("game_state")
        .update({
          current_question_id: prevQuestion.id,
          current_question: prevQuestion.question_text,
          image_url: prevQuestion.image_url,
          session_question_index: prevIndex,
          is_locked: false,
          first_buzzer_team_id: null,
        })
        .eq("id", gameState.id);

      if (error) throw error;

      setCurrentQuestionIndex(prevIndex);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <Button onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate("/admin")} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{session.session_name}</h1>
                <p className="text-muted-foreground">Session #{session.session_number}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Session</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this session? This will permanently delete the session and all its questions. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteSession} className="bg-red-600 hover:bg-red-700">
                      Delete Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={toggleFullscreen} variant="outline">
                {isFullscreen ? (
                  <>
                    <Minimize className="w-4 h-4 mr-2" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize className="w-4 h-4 mr-2" />
                    Show Fullscreen
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Question Management */}
          <div className="bg-card border-2 border-primary rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-bold">Question Management</h2>
            
            {/* Add/Edit Question Form */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter question text..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={saveQuestion} 
                  disabled={!questionText.trim() || sessionQuestions.length >= 20}
                  className="px-8"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingQuestion ? "Update Question" : "Save Question"}
                </Button>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-4">
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
                      setSelectedFile(null);
                    }}
                    placeholder="Or enter image URL directly..."
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Session Questions ({sessionQuestions.length}/20)
                </h3>
                {editingQuestion && (
                  <Button
                    onClick={() => {
                      setEditingQuestion(null);
                      setQuestionText("");
                      setImageUrl("");
                      setSelectedFile(null);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
              
              {sessionQuestions.length === 0 ? (
                <p className="text-muted-foreground">No questions added yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sessionQuestions.map((question, index) => (
                    <div key={question.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <span className="text-sm">{question.question_text}</span>
                        </div>
                        {question.image_url && (
                          <div className="text-xs text-blue-600">Has Image</div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => editQuestion(question)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
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
                              <AlertDialogAction onClick={() => deleteQuestion(question.id)}>
                                Delete
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

          {/* Quiz Controls */}
          <div className="bg-card border-2 border-secondary rounded-2xl p-6 space-y-4">
            <h2 className="text-2xl font-bold">Quiz Controls</h2>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {!isQuizActive ? (
                  <Button 
                    onClick={startQuiz} 
                    disabled={sessionQuestions.length === 0}
                    className="px-6"
                  >
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
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        {currentQuestionIndex + 1} of {sessionQuestions.length}
                      </span>
                      <Button 
                        onClick={nextQuestion} 
                        disabled={currentQuestionIndex === sessionQuestions.length - 1}
                        variant="outline"
                        size="sm"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {sessionQuestions.length} questions in session
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Footer removed */}
      
      {/* Fullscreen Quiz Display */}
      {isFullscreen && sessionQuestions.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-8">
          <div className="text-center space-y-8 max-w-6xl w-full">
            {/* Image Display */}
            {sessionQuestions[currentQuestionIndex]?.image_url && (
              <div className="flex justify-center mb-8">
                <img 
                  src={sessionQuestions[currentQuestionIndex].image_url} 
                  alt="Question image" 
                  className="max-w-full max-h-96 object-contain rounded-lg shadow-2xl"
                  onError={(e) => {
                    console.error('Image failed to load:', sessionQuestions[currentQuestionIndex].image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Question Text */}
            <div className="text-white text-4xl md:text-6xl lg:text-8xl font-bold leading-tight">
              {sessionQuestions[currentQuestionIndex]?.question_text || "No question available"}
            </div>

            {/* Transient buzz banner - every buzz */}
            {recentBuzzTeam && !gameState?.is_locked && (
              <div className="bg-white/10 border-2 border-accent rounded-2xl p-4 animate-buzz">
                <div className="flex items-center justify-center gap-3">
                  <Zap className={`w-10 h-10 text-${TEAM_COLORS[recentBuzzTeam.team_number - 1]}`} />
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {recentBuzzTeam.team_name} buzzed!
                    </div>
                    <div className={`text-sm md:text-base text-${TEAM_COLORS[recentBuzzTeam.team_number - 1]}`}>
                      Team {recentBuzzTeam.team_number}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Buzz Status - Which team buzzed first */}
            {gameState?.is_locked && firstBuzzerTeam && (
              <div className="bg-white/10 border-2 border-white/30 rounded-2xl p-6 animate-buzz">
                <div className="flex items-center justify-center gap-4">
                  <Zap className={`w-12 h-12 text-${TEAM_COLORS[firstBuzzerTeam.team_number - 1]}`} />
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white">
                      {firstBuzzerTeam.team_name} buzzed first!
                    </div>
                    <div className={`text-lg md:text-xl text-${TEAM_COLORS[firstBuzzerTeam.team_number - 1]}`}>
                      Team {firstBuzzerTeam.team_number}
                    </div>
                  </div>
                </div>
                <div className="flex justify-center mt-6">
                  <Button onClick={handleUnlock} size="lg" className="bg-green-600/20 border-green-500/50 text-green-200 hover:bg-green-600/30">
                    <Unlock className="w-5 h-5 mr-2" />
                    Unlock Buzzers
                  </Button>
                </div>
              </div>
            )}
            
            {/* Question Counter */}
            <div className="text-white text-2xl font-semibold">
              Question {currentQuestionIndex + 1} of {sessionQuestions.length}
            </div>
            
            {/* Keyboard Instructions */}
            <div className="text-white/70 text-sm">
              Use ← → arrow keys to navigate • ESC to exit fullscreen • Space to end quiz
            </div>
            
            {/* Navigation Controls */}
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
              
              <Button 
                onClick={nextQuestion}
                disabled={currentQuestionIndex === sessionQuestions.length - 1}
                variant="outline" 
                size="lg"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
            
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
              
              <Button 
                onClick={endQuiz} 
                variant="destructive" 
                size="lg"
                className="bg-red-600/20 border-red-500/50 text-red-200 hover:bg-red-600/30"
              >
                <Pause className="w-5 h-5 mr-2" />
                End Quiz
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Popup (visible on question display screen too) */}
      <WinnerPopup
        isOpen={showWinnerPopup}
        onClose={() => {
          setShowWinnerPopup(false);
          setWinnerTeam(null);
        }}
        winnerTeam={winnerTeam}
      />
    </div>
  );
};

export default SessionManagement;
