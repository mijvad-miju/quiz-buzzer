# Manual Database Fix in Supabase

Follow these steps to manually fix the questions table in Supabase:

## Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on "Table Editor" in the left sidebar
3. Find the "questions" table

## Step 2: Check Current Table Structure
1. Click on the "questions" table
2. Look at the columns - you should see:
   - id
   - question_text
   - image_url
   - created_at
   - updated_at

## Step 3: Add Missing Columns Manually

### Add session_id column:
1. Click the "+" button to add a new column
2. Set the following:
   - **Column name**: `session_id`
   - **Type**: `uuid`
   - **Default value**: Leave empty
   - **Is nullable**: Yes (for now)
   - Click "Save"

### Add order_index column:
1. Click the "+" button to add another column
2. Set the following:
   - **Column name**: `order_index`
   - **Type**: `int4` (integer)
   - **Default value**: `0`
   - **Is nullable**: No
   - Click "Save"

### Add is_active column:
1. Click the "+" button to add another column
2. Set the following:
   - **Column name**: `is_active`
   - **Type**: `bool` (boolean)
   - **Default value**: `false`
   - **Is nullable**: No
   - Click "Save"

## Step 4: Set Up Foreign Key Relationship
1. Go to "Database" → "Tables" in the left sidebar
2. Click on "questions" table
3. Go to the "Relationships" tab
4. Click "Add a relationship"
5. Set the following:
   - **Type**: Foreign Key
   - **Referenced table**: `sessions`
   - **Referenced column**: `id`
   - **Local column**: `session_id`
   - **On delete**: Cascade
   - Click "Save"

## Step 5: Update Existing Data
1. Go to "SQL Editor" in the left sidebar
2. Run this query to update existing questions:

```sql
-- Update existing questions to have proper values
UPDATE public.questions 
SET order_index = ROW_NUMBER() OVER (ORDER BY created_at ASC)
WHERE order_index IS NULL OR order_index = 0;

UPDATE public.questions 
SET is_active = false
WHERE is_active IS NULL;
```

## Step 6: Create Indexes (Optional but Recommended)
Run this in SQL Editor:

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);
```

## Step 7: Verify the Fix
Run this query to check if everything is working:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see all the columns including:
- session_id
- order_index  
- is_active

## Step 8: Test Adding Questions
1. Go back to your application
2. Try adding a question to a session
3. It should work without errors now

## Troubleshooting

If you still get errors:
1. Check that all columns were added correctly
2. Make sure the foreign key relationship is set up
3. Try refreshing your application
4. Check the browser console for any error messages

## Alternative: Use SQL Editor Only

If the Table Editor doesn't work, you can run this complete SQL script in the SQL Editor:

```sql
-- Complete fix using SQL only
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add foreign key constraint
ALTER TABLE public.questions 
ADD CONSTRAINT IF NOT EXISTS questions_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Update existing data
UPDATE public.questions 
SET order_index = ROW_NUMBER() OVER (ORDER BY created_at ASC)
WHERE order_index IS NULL OR order_index = 0;

UPDATE public.questions 
SET is_active = false
WHERE is_active IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questions_session_id ON public.questions(session_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(session_id, order_index);

SELECT 'Questions table fixed successfully!' as status;
```
