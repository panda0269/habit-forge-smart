/**
 * Migration script: Supabase -> MongoDB
 * 
 * This script migrates all habits and habit logs from Supabase to MongoDB.
 * It is idempotent - running it multiple times will not create duplicates.
 * 
 * Usage: node scripts/migrate-from-supabase.js
 * 
 * Required environment variables:
 * - MONGO_URI: MongoDB connection string
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (for full access)
 */

const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Import models
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');

// Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrate() {
  console.log('='.repeat(60));
  console.log('Starting Supabase -> MongoDB Migration');
  console.log('='.repeat(60));
  console.log('');

  // Connect to MongoDB
  console.log('[1/5] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ MongoDB connected');
  console.log('');

  // Fetch all habits from Supabase
  console.log('[2/5] Fetching habits from Supabase...');
  const { data: supabaseHabits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .order('created_at', { ascending: true });

  if (habitsError) {
    throw new Error(`Failed to fetch habits: ${habitsError.message}`);
  }

  // Filter out test users
  const validHabits = supabaseHabits.filter(h => h.user_id !== 'testuser');
  console.log(`✓ Found ${supabaseHabits.length} habits (${validHabits.length} valid, ${supabaseHabits.length - validHabits.length} test users filtered)`);
  console.log('');

  // Fetch all habit logs from Supabase
  console.log('[3/5] Fetching habit logs from Supabase...');
  const { data: supabaseLogs, error: logsError } = await supabase
    .from('habit_logs')
    .select('*')
    .order('created_at', { ascending: true });

  if (logsError) {
    throw new Error(`Failed to fetch habit logs: ${logsError.message}`);
  }

  // Filter out test users
  const validLogs = supabaseLogs.filter(l => l.user_id !== 'testuser');
  console.log(`✓ Found ${supabaseLogs.length} habit logs (${validLogs.length} valid, ${supabaseLogs.length - validLogs.length} test users filtered)`);
  console.log('');

  // Migrate habits
  console.log('[4/5] Migrating habits to MongoDB...');
  let habitsCreated = 0;
  let habitsSkipped = 0;
  const habitIdMap = new Map(); // Map Supabase ID -> MongoDB ID

  for (const habit of validHabits) {
    try {
      // Check if already migrated (by supabaseId)
      const existing = await Habit.findOne({ supabaseId: habit.id });
      
      if (existing) {
        habitIdMap.set(habit.id, existing._id.toString());
        habitsSkipped++;
        continue;
      }

      // Create new habit in MongoDB
      const newHabit = new Habit({
        userId: habit.user_id,
        title: habit.title,
        description: habit.description || null,
        category: habit.category || 'other',
        frequency: habit.frequency || 'daily',
        targetCount: habit.target_count || 1,
        color: habit.color || '#10B981',
        reminderTime: habit.reminder_time || null,
        reminderEnabled: habit.reminder_enabled || false,
        supabaseId: habit.id,
        createdAt: new Date(habit.created_at),
        updatedAt: new Date(habit.updated_at || habit.created_at)
      });

      const saved = await newHabit.save();
      habitIdMap.set(habit.id, saved._id.toString());
      habitsCreated++;
      
      if (habitsCreated % 10 === 0) {
        console.log(`  ... migrated ${habitsCreated} habits`);
      }
    } catch (err) {
      console.error(`  ✗ Error migrating habit ${habit.id}: ${err.message}`);
    }
  }

  console.log(`✓ Habits migration complete: ${habitsCreated} created, ${habitsSkipped} already existed`);
  console.log('');

  // Migrate habit logs
  console.log('[5/5] Migrating habit logs to MongoDB...');
  let logsCreated = 0;
  let logsSkipped = 0;
  let logsErrors = 0;

  for (const log of validLogs) {
    try {
      // Get MongoDB habit ID
      const mongoHabitId = habitIdMap.get(log.habit_id);
      
      if (!mongoHabitId) {
        // Habit wasn't migrated, skip log
        logsSkipped++;
        continue;
      }

      // Check if log already exists (by habitId + date)
      const existing = await HabitLog.findOne({
        habitId: mongoHabitId,
        date: log.completed_at
      });

      if (existing) {
        logsSkipped++;
        continue;
      }

      // Create new log in MongoDB
      const newLog = new HabitLog({
        habitId: mongoHabitId,
        userId: log.user_id,
        date: log.completed_at,
        completed: log.completed !== false,
        notes: log.notes || null,
        createdAt: new Date(log.created_at)
      });

      await newLog.save();
      logsCreated++;

      if (logsCreated % 50 === 0) {
        console.log(`  ... migrated ${logsCreated} logs`);
      }
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key, already exists
        logsSkipped++;
      } else {
        console.error(`  ✗ Error migrating log ${log.id}: ${err.message}`);
        logsErrors++;
      }
    }
  }

  console.log(`✓ Habit logs migration complete: ${logsCreated} created, ${logsSkipped} skipped, ${logsErrors} errors`);
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Habits: ${habitsCreated} created, ${habitsSkipped} already existed`);
  console.log(`Logs:   ${logsCreated} created, ${logsSkipped} skipped, ${logsErrors} errors`);
  console.log('');
  console.log('NOTE: Supabase data was NOT deleted. You can safely re-run this script.');
  console.log('='.repeat(60));

  await mongoose.disconnect();
  console.log('MongoDB disconnected. Migration complete!');
}

// Run migration
migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
