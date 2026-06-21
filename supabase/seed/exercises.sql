-- LiftMind v2 — exercise dictionary seed
-- Run after schema.sql. Aliases let the coach (Phase 2) resolve free-text
-- names ("bp", "front squat") to a canonical exercise without substring hacks.

insert into exercises (canonical_name, category, modality, is_competition, aliases) values
  ('Back Squat',          'squat',     'barbell',    true,  array['squat','back squat','bb squat','high bar','low bar']),
  ('Bench Press',         'bench',     'barbell',    true,  array['bench','bp','bench press','flat bench']),
  ('Deadlift',            'deadlift',  'barbell',    true,  array['deadlift','dl','conventional','conventional deadlift']),
  ('Overhead Press',      'press',     'barbell',    false, array['ohp','press','military press','strict press','shoulder press']),
  ('Front Squat',         'squat',     'barbell',    false, array['front squat','fs']),
  ('Romanian Deadlift',   'deadlift',  'barbell',    false, array['rdl','romanian deadlift','romanian dl']),
  ('Incline Bench Press', 'bench',     'barbell',    false, array['incline','incline bench','incline press']),
  ('Barbell Row',         'accessory', 'barbell',    false, array['row','bb row','barbell row','pendlay row']),
  ('Pull-up',             'accessory', 'bodyweight', false, array['pullup','pull up','pull-up','chin up','chinup']),
  ('Dip',                 'accessory', 'bodyweight', false, array['dip','dips']),
  ('Lat Pulldown',        'accessory', 'machine',    false, array['pulldown','lat pulldown']),
  ('Leg Press',           'accessory', 'machine',    false, array['leg press']),
  ('Bicep Curl',          'accessory', 'dumbbell',   false, array['curl','curls','bicep curl','db curl']),
  ('Tricep Extension',    'accessory', 'cable',      false, array['tricep','triceps','tricep extension','pushdown']),
  ('Lateral Raise',       'accessory', 'dumbbell',   false, array['lateral raise','side raise','lat raise'])
on conflict (canonical_name) do nothing;
