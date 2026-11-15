CREATE TABLE IF NOT EXISTS reward_challenges(id TEXT PRIMARY KEY,petId TEXT NOT NULL REFERENCES pets(id),kind TEXT NOT NULL,title TEXT NOT NULL,instructions TEXT NOT NULL,startDay TEXT NOT NULL,endDay TEXT NOT NULL,requiredDays INTEGER NOT NULL,discount INTEGER NOT NULL,planId TEXT,snapshot TEXT,createdBy TEXT NOT NULL,createdAt TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS task_photos(id TEXT PRIMARY KEY,challengeId TEXT NOT NULL REFERENCES reward_challenges(id),petId TEXT NOT NULL REFERENCES pets(id),day TEXT NOT NULL,image TEXT NOT NULL,uploadedAt TEXT NOT NULL,UNIQUE(challengeId,day));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS reward_coupons(id TEXT PRIMARY KEY,petId TEXT NOT NULL REFERENCES pets(id),challengeId TEXT NOT NULL,title TEXT NOT NULL,discount INTEGER NOT NULL,code TEXT NOT NULL UNIQUE,earnedAt TEXT NOT NULL,expiresDay TEXT NOT NULL,appliedAt TEXT,selection TEXT);
