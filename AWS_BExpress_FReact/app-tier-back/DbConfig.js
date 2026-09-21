module.exports = Object.freeze({
    DB_HOST: process.env.DB_HOST || 'mysql-db.ch8sokem81lg.ap-south-2.rds.amazonaws.com',
    DB_USER: process.env.DB_USER || 'admin',
    DB_PWD: process.env.DB_PWD || '123456789',
    DB_NAME: process.env.DB_NAME || 'webappdb'
});