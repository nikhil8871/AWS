module.exports = Object.freeze({
    DB_HOST: process.env.DB_HOST || 'mysql-db',
    DB_USER: process.env.DB_USER || 'root',
    DB_PWD: process.env.DB_PWD || '1234',
    DB_NAME: process.env.DB_NAME || 'webappdb'
});
