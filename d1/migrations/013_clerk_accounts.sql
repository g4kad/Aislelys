-- Clerk sign-in: each partner (users row) can be linked to one Clerk account.
-- Partners who only ever use Clerk get an unusable placeholder password, so
-- the old password login can't be used for them.
ALTER TABLE users ADD COLUMN clerkUserId TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user ON users(clerkUserId);

-- A private link the first partner sends so the other can join the planner.
-- It points at the partner's (not yet linked) users row.
CREATE TABLE IF NOT EXISTS partner_invites (
  token TEXT PRIMARY KEY,
  coupleId TEXT NOT NULL,
  userId TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
