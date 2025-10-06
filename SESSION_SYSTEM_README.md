# Session-Based Quiz System

This document describes the new session-based quiz system that allows organizing questions into sessions with a maximum of 20 questions per session and displays a leaderboard when each session is completed.

## Features

### 1. Session Management
- **Create Sessions**: Admins can create multiple quiz sessions
- **Session Naming**: Each session has a descriptive name and number
- **Active Session**: Only one session can be active at a time
- **Session Status**: Sessions can be active, completed, or inactive

### 2. Question Organization
- **Session-Linked Questions**: Questions are now linked to specific sessions
- **20 Question Limit**: Each session can contain a maximum of 20 questions
- **Question Ordering**: Questions within a session are ordered by `order_index`
- **Session Validation**: System prevents adding questions when session limit is reached

### 3. Leaderboard System
- **Automatic Detection**: System automatically detects when a session reaches 20 questions
- **Session Completion**: Sessions are automatically marked as completed
- **Leaderboard Popup**: Beautiful leaderboard popup shows when session is completed
- **Team Rankings**: Teams are ranked by score, with tie-breaking by correct answers
- **Detailed Stats**: Shows score, questions answered, correct answers, and accuracy percentage

## Database Schema

### New Tables

#### `sessions`
```sql
- id (UUID, Primary Key)
- session_name (TEXT, NOT NULL)
- session_number (INTEGER, NOT NULL)
- is_active (BOOLEAN, DEFAULT false)
- is_completed (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `questions` (Updated)
```sql
- id (UUID, Primary Key)
- session_id (UUID, Foreign Key to sessions)
- question_text (TEXT, NOT NULL)
- image_url (TEXT, NULLABLE)
- order_index (INTEGER, DEFAULT 0)
- is_active (BOOLEAN, DEFAULT false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `session_scores`
```sql
- id (UUID, Primary Key)
- session_id (UUID, Foreign Key to sessions)
- team_id (UUID, Foreign Key to teams)
- score (INTEGER, DEFAULT 0)
- questions_answered (INTEGER, DEFAULT 0)
- correct_answers (INTEGER, DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `game_state` (Updated)
```sql
- current_session_id (UUID, Foreign Key to sessions)
- current_question_id (UUID, Foreign Key to questions)
- session_question_index (INTEGER, DEFAULT 0)
```

### Database Functions

#### `check_session_complete(session_uuid UUID)`
- Returns `BOOLEAN`
- Checks if a session has reached 20 questions

#### `get_session_leaderboard(session_uuid UUID)`
- Returns leaderboard data for a specific session
- Includes team name, score, questions answered, correct answers, and accuracy

### Database Triggers

#### `trigger_auto_complete_session`
- Automatically marks sessions as completed when they reach 20 questions
- Fires after inserting a new question

## User Interface

### Admin Dashboard Updates

#### Session Management Section
- **Create New Session**: Input field and button to create sessions
- **Active Session Display**: Shows current active session with question count
- **Session Grid**: Visual grid showing all sessions with status indicators
- **Session Activation**: One-click activation of sessions

#### Question Management Updates
- **Session Validation**: Prevents adding questions without an active session
- **Question Limit Enforcement**: Shows warning when 20 question limit is reached
- **Session Context**: Questions are now linked to the active session

#### Leaderboard Popup
- **Automatic Display**: Appears when a session is completed
- **Team Rankings**: Visual ranking with icons (Trophy, Medal, Award)
- **Detailed Statistics**: Score, questions answered, correct answers, accuracy
- **Responsive Design**: Works on all screen sizes

## Usage Workflow

### 1. Setting Up a Session
1. Admin creates a new session with a descriptive name
2. Admin activates the session
3. Admin adds questions to the session (up to 20)
4. System tracks question count and prevents exceeding limit

### 2. Running a Session
1. Admin starts the quiz with the active session
2. Questions are displayed from the session
3. Teams buzz in and answer questions
4. Scores are tracked per session

### 3. Session Completion
1. When 20 questions are reached, session is automatically completed
2. Leaderboard popup appears showing final rankings
3. Admin can continue to next session or create new sessions

## Technical Implementation

### Key Components

#### `LeaderboardPopup.tsx`
- Reusable popup component for displaying session results
- Fetches leaderboard data using database function
- Responsive design with ranking icons and statistics

#### Session Management Functions
- `fetchSessions()`: Retrieves all sessions
- `createSession()`: Creates new sessions
- `activateSession()`: Activates a session and updates game state
- `checkSessionCompletion()`: Monitors for session completion

#### Question Management Updates
- `saveQuestion()`: Now validates session and enforces 20 question limit
- Questions are linked to active session
- Order index is automatically assigned

### Real-time Updates
- Session completion is monitored every 2 seconds
- Automatic leaderboard popup when session completes
- Real-time question count updates

## Benefits

1. **Organized Structure**: Questions are organized into logical sessions
2. **Controlled Length**: 20 question limit prevents overly long sessions
3. **Clear Progress**: Visual indicators show session progress
4. **Engaging Results**: Beautiful leaderboard popup celebrates completion
5. **Flexible Management**: Easy session creation and activation
6. **Data Integrity**: Database constraints prevent invalid states

## Future Enhancements

- Session templates for quick setup
- Session scheduling and timing
- Advanced analytics per session
- Session export/import functionality
- Custom session themes and branding
