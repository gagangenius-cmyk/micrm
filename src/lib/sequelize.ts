import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import mysql from 'mysql2';

// Load environment variables
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'mysql://root:@localhost:3306/dmconsultant_mydmcons_dm',
  {
    dialect: 'mysql',
    dialectModule: mysql,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false,
      freezeTableName: true,
    },
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  }
);

// The ~90 GROUP BY queries in this codebase were written against XAMPP's
// permissive default sql_mode (selecting columns that are not in the GROUP BY).
// A stock MySQL 8 server enables ONLY_FULL_GROUP_BY and rejects them with
// ER_WRONG_FIELD_WITH_GROUP (e.g. /api/admin/recovery-report). Drop just that
// one mode for this app's own connections; the rest of the strict modes stay,
// and the server's global sql_mode is left alone.
sequelize.addHook('afterConnect', (connection: unknown) =>
  new Promise<void>((resolve, reject) => {
    (connection as { query: (sql: string, cb: (err: Error | null) => void) => void }).query(
      "SET SESSION sql_mode = REPLACE(@@SESSION.sql_mode, 'ONLY_FULL_GROUP_BY', '')",
      (err) => (err ? reject(err) : resolve()),
    );
  }),
);

// Test the connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully with Sequelize');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export { sequelize, connectDB };