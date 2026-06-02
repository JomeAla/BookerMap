module.exports = {
  apps: [{
    name: 'bookermap-web',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    env_file: '.env.local',
    max_memory_restart: '1G',
  }]
}
