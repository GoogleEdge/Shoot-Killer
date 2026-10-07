-- Face enrollment for AI identification. Portraits stay off the live poll.
alter table players add column if not exists portrait text;

alter table shots add column if not exists note text;
alter table shots alter column target_name set default '';
