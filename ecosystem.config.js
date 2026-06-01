module.exports = {
  apps: [
    {
      name: 'be-rich',
      script: '.next/standalone/server.js',
      cwd: '/var/www/be-rich',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'file:/var/www/be-rich/db/production.db',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      error_file: '/var/www/be-rich/logs/error.log',
      out_file: '/var/www/be-rich/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
