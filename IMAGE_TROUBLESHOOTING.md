# Image Display Troubleshooting Guide

## Issue: Images not showing anywhere in the application

### Step 1: Check Database Structure
Run this SQL in Supabase SQL Editor:

```sql
-- Check if image_url columns exist
SELECT 'questions' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions' AND column_name = 'image_url'
UNION ALL
SELECT 'game_state' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_state' AND column_name = 'image_url';
```

### Step 2: Fix Database Structure (if needed)
Run this SQL in Supabase SQL Editor:

```sql
-- Add image_url to questions table if missing
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url to game_state table if missing  
ALTER TABLE public.game_state ADD COLUMN IF NOT EXISTS image_url TEXT;
```

### Step 3: Test Image Saving
1. Go to admin panel (`/admin`)
2. Type a question: "What is the capital of France?"
3. Add an image URL: `https://via.placeholder.com/400x300/0066cc/ffffff?text=Sample+Image`
4. Click "Save Question"
5. Check browser console for logs:
   - Should see: "Saving question: What is the capital of France?"
   - Should see: "Saving image_url: https://via.placeholder.com/..."

### Step 4: Test Image Display
1. Click "Start Quiz"
2. Check browser console for logs:
   - Should see: "Displaying question: {question_text: '...', image_url: '...'}"
   - Should see: "Question displayed successfully with image_url: ..."

### Step 5: Check Database Data
Run this SQL to verify data:

```sql
-- Check saved questions
SELECT id, question_text, image_url, created_at 
FROM public.questions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check current game state
SELECT id, current_question, image_url, is_locked 
FROM public.game_state 
LIMIT 1;
```

### Step 6: Common Issues & Solutions

**Issue 1: image_url column doesn't exist**
- Solution: Run the database fix SQL above

**Issue 2: Image URL is invalid**
- Solution: Use a valid image URL like `https://via.placeholder.com/400x300`

**Issue 3: Image URL is null/empty**
- Solution: Make sure you're entering an image URL before saving

**Issue 4: Images not loading**
- Solution: Check browser network tab for 404 errors

### Step 7: Test with Sample Data
Run this SQL to create test data:

```sql
-- Insert test question with image
INSERT INTO public.questions (question_text, image_url) 
VALUES ('Test question with image', 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Sample+Image');
```

### Debug Information
The code now includes console logging. Check browser console for:
- Question saving logs
- Question display logs
- Image URL values
- Any error messages

### Expected Behavior
1. **Admin Panel**: Image preview should show when you enter an image URL
2. **Question List**: Questions with images should show 📷 indicator
3. **Fullscreen**: Images should display above question text
4. **Participant View**: Images should show on buzzer page


