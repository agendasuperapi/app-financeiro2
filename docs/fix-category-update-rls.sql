-- Migration to fix category update RLS policy
-- This allows admins to edit default categories (user_id IS NULL)
-- while regular users can only edit their own categories

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own categories" ON poupeja_categories;

-- Create new UPDATE policy that allows:
-- 1. Users to update their own categories (user_id = auth.uid())
-- 2. Admins to update default categories (user_id IS NULL)
CREATE POLICY "Users can update own or admins can update default" ON poupeja_categories
FOR UPDATE USING (
  user_id = auth.uid() 
  OR (
    user_id IS NULL 
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);
