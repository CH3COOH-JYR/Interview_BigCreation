module.exports = {
  apps: [
    {
      name: 'ai-interview-backend',
      script: './backend/app.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
        MONGO_URI: 'mongodb://localhost:27017/ai-interview',
        BACKEND_URL: 'http://localhost:5001/api'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
        HOST: 'localhost',
        MONGO_URI: 'mongodb://localhost:27017/ai-interview-prod',
        BACKEND_URL: 'http://localhost:5001/api'
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}; 