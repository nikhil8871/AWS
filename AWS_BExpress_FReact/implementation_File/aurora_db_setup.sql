-- ==============================================================================
-- AWS Aurora MySQL Database Initialization Script
-- For 3-Tier Architecture (App Tier <-> Aurora DB)
-- ==============================================================================

-- 1. Create the database
CREATE DATABASE IF NOT EXISTS webappdb;

-- 2. Use the database
USE webappdb;

-- 3. Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT NOT NULL AUTO_INCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(100) NOT NULL,
    PRIMARY KEY(id)
);

-- 4. Insert initial seed transactions
INSERT INTO transactions (amount, description) VALUES
    (400.00, 'groceries'),
    (150.50, 'utilities'),
    (75.00, 'restaurant');

-- 5. Verify records
SELECT * FROM transactions;
