ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cash_collected';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'payment_verified';