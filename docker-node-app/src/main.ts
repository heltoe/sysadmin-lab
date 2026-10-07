import express from 'express';
import { Pool } from 'pg'; // PostgreSQL клиент

const app = express();
app.use(express.json());

// Подключение к БД через переменные окружения
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'taskdb',
  password: process.env.POSTGRES_PASSWORD || 'secret',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Создаем таблицу при старте
pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    done BOOLEAN DEFAULT false
  )
`).catch(err => console.error('DB init error:', err));

// Получить все задачи
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Добавить задачу
app.post('/api/tasks', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await pool.query(
      'INSERT INTO tasks (text) VALUES ($1) RETURNING *',
      [text]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});