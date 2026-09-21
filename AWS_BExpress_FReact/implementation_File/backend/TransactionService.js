const dbcreds = require('./DbConfig');
const mysql = require('mysql2');

const con = mysql.createConnection({
    host: dbcreds.DB_HOST,
    user: dbcreds.DB_USER,
    password: dbcreds.DB_PWD,
    database: dbcreds.DB_NAME
});

// Auto-initialize database: create table and insert seed data if empty
function initDb() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS transactions (
            id INT NOT NULL AUTO_INCREMENT,
            amount DECIMAL(10,2),
            description VARCHAR(100),
            PRIMARY KEY(id)
        );
    `;

    con.query(createTableQuery, function (err, result) {
        if (err) {
            console.error("Error ensuring transactions table exists:", err.message);
            return;
        }
        console.log("Database table 'transactions' verified/created successfully.");

        // Check if table is empty and insert initial seed row if needed
        const checkQuery = "SELECT COUNT(*) AS count FROM transactions";
        con.query(checkQuery, function (err, rows) {
            if (err) {
                console.error("Error checking transactions count:", err.message);
                return;
            }
            if (rows && rows[0] && rows[0].count === 0) {
                const seedQuery = "INSERT INTO transactions (amount, description) VALUES (400, 'groceries')";
                con.query(seedQuery, function (err) {
                    if (err) {
                        console.error("Error inserting initial seed data:", err.message);
                    } else {
                        console.log("Seeded initial data into 'transactions' table.");
                    }
                });
            }
        });
    });
}

// Run table creation and seeding on startup
initDb();

function addTransaction(amount, desc) {
    var mysql = `INSERT INTO \`transactions\` (\`amount\`, \`description\`) VALUES ('${amount}','${desc}')`;
    con.query(mysql, function (err, result) {
        if (err) throw err;
        console.log("Adding to the table should have worked");
    })
    return 200;
}

function getAllTransactions(callback) {
    var mysql = "SELECT * FROM transactions";
    con.query(mysql, function (err, result) {
        if (err) throw err;
        console.log("Getting all transactions...");
        return (callback(result));
    });
}

function findTransactionById(id, callback) {
    var mysql = `SELECT * FROM transactions WHERE id = ${id}`;
    con.query(mysql, function (err, result) {
        if (err) throw err;
        console.log(`retrieving transactions with id ${id}`);
        return (callback(result));
    })
}

function deleteAllTransactions(callback) {
    var mysql = "DELETE FROM transactions";
    con.query(mysql, function (err, result) {
        if (err) throw err;
        console.log("Deleting all transactions...");
        return (callback(result));
    })
}

function deleteTransactionById(id, callback) {
    var mysql = `DELETE FROM transactions WHERE id = ${id}`;
    con.query(mysql, function (err, result) {
        if (err) throw err;
        console.log(`Deleting transactions with id ${id}`);
        return (callback(result));
    })
}


module.exports = { initDb, addTransaction, getAllTransactions, deleteAllTransactions, findTransactionById, deleteTransactionById };







