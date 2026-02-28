-- Migration: Fix decrement_credits race condition by adding FOR UPDATE row lock
-- Date: 2026-02-27
--
-- BUG H14 FIX: The original decrement_credits function performed a SELECT to read
-- the current balance, then a separate UPDATE to decrement it. Under concurrent
-- load, two simultaneous calls could both pass the balance check before either
-- UPDATE commits, causing both to succeed and the balance to go negative.
--
-- Fix: Add FOR UPDATE to the SELECT so the row is locked immediately. The second
-- concurrent caller will block on the lock and see the already-decremented balance
-- when it finally acquires it, correctly raising 'Insufficient credits' if needed.

CREATE OR REPLACE FUNCTION public.decrement_credits(target_user_id UUID, amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Set trusted operation flag
  PERFORM set_config('app.trusted_credit_operation', 'true', true);

  -- Get current balance WITH a row-level lock to prevent TOCTOU races.
  -- Concurrent callers will block here until the first transaction commits,
  -- ensuring they see the updated balance before re-checking.
  SELECT credits_balance INTO current_balance
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF current_balance < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Decrement credits
  UPDATE public.profiles
  SET credits_balance = credits_balance - amount
  WHERE id = target_user_id
  RETURNING credits_balance INTO new_balance;

  RETURN new_balance;
END;
$$;
