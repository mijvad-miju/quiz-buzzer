-- Setup Supabase Storage for question images
-- Run this in Supabase SQL Editor

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true);

-- Set up RLS policies for the bucket
CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'question-images' 
  AND auth.role() = 'authenticated'
);
