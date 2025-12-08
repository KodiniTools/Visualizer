/**
 * PM2 Ecosystem Configuration
 *
 * Starte mit: pm2 start ecosystem.config.cjs
 * Status:     pm2 status
 * Logs:       pm2 logs visualizer-backend
 * Restart:    pm2 restart visualizer-backend
 * Stop:       pm2 stop visualizer-backend
 */

module.exports = {
  apps: [
    {
      // ═══════════════════════════════════════════════════════════════════
      // VISUALIZER BACKEND SERVER
      // ═══════════════════════════════════════════════════════════════════
      name: 'visualizer-backend',
      script: './server/index.js',
      cwd: __dirname,

      // Node.js Einstellungen
      interpreter: 'node',
      node_args: '--experimental-modules',

      // Instanzen (für Load Balancing)
      instances: 1,        // Oder 'max' für alle CPU-Kerne
      exec_mode: 'fork',   // Oder 'cluster' für mehrere Instanzen

      // Umgebungsvariablen
      env: {
        NODE_ENV: 'development',
        PORT: 9006,
        CORS_ORIGIN: '*'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9006,
        CORS_ORIGIN: 'https://kodinitools.com'
      },

      // Auto-Restart
      watch: false,                    // In Produktion: false
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'server/uploads',
        'server/files',
        'dist',
        '.git',
        'logs'
      ],

      // Restart bei Absturz
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
      min_uptime: '10s',

      // Memory Management
      max_memory_restart: '1G',        // Restart bei 1GB RAM

      // Logging
      log_file: './logs/visualizer-combined.log',
      out_file: './logs/visualizer-out.log',
      error_file: './logs/visualizer-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful Shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Sonstiges
      time: true,                      // Zeitstempel in Logs
    }
  ],

  // ═══════════════════════════════════════════════════════════════════
  // DEPLOYMENT (optional)
  // ═══════════════════════════════════════════════════════════════════
  deploy: {
    production: {
      user: 'deploy',
      host: ['kodinitools.com'],
      ref: 'origin/main',
      repo: 'git@github.com:KodiniTools/Visualizer.git',
      path: '/var/www/kodinitools.com/visualizer',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': ''
    }
  }
};
