/*
# Extend tasks table for professional task management system

## Overview
Upgrades the existing simple tasks table into a full task management system with:
- Three task levels: daily, weekly, monthly
- Rich metadata: description, type, priority, deadline, difficulty, quantity, status, recurrence
- Smart priority calculation support
- Task dependencies and subtasks
- Time tracking (start/end times, estimated duration)

## Changes to existing `tasks` table
- ADD columns: description, task_type, task_level, start_time, end_time, estimated_minutes,
  priority, deadline, difficulty, quantity, quantity_type, status, recurrence, recurrence_config,
  depends_on, parent_task_id, smart_priority, completed_at, notes
- task_date remains for backward compatibility (used for daily tasks)
- For weekly tasks: task_date = start of week (Saturday)
- For monthly tasks: task_date = 1st of Jalali month
- completed remains boolean for backward compatibility

## Security
- RLS already enabled on tasks table
- Existing owner-scoped CRUD policies remain in effect
- New columns are accessible to the owner via existing policies
*/

-- Add new columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS task_level text DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS start_time text DEFAULT '',
  ADD COLUMN IF NOT EXISTS end_time text DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_minutes int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS quantity int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS recurrence_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS depends_on uuid,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid,
  ADD COLUMN IF NOT EXISTS smart_priority int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Add index for task_level filtering
CREATE INDEX IF NOT EXISTS idx_tasks_level_date ON public.tasks(user_id, task_level, task_date);

-- Add index for deadline queries
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(user_id, deadline);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(user_id, status);

-- Add index for parent task (subtasks)
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;