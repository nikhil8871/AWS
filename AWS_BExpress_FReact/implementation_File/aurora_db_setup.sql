-- ==============================================================================
-- AWS Aurora MySQL Database Initialization Script
-- For 3-Tier Architecture (App Tier <-> Aurora DB)
-- Database Name: webappdb
-- ==============================================================================

-- 1. Ensure and switch to the database
CREATE DATABASE IF NOT EXISTS webappdb;
USE webappdb;

-- 2. Create the transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT NOT NULL AUTO_INCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(100) NOT NULL,
    PRIMARY KEY(id)
);

-- 3. Insert initial seed transactions
INSERT INTO transactions (amount, description) VALUES
    (400.00, 'groceries'),
    (150.50, 'utilities'),
    (75.00, 'restaurant');

-- 4. Verify records
SELECT * FROM transactions;
