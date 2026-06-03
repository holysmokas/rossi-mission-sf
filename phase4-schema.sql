ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'online';
ALTER TABLE admin_users ADD COLUMN report_frequency TEXT NOT NULL DEFAULT 'weekly';
