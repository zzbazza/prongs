module.exports = {
  // Authentication
  ACCESS_PASSWORD: 'historicka-expozice-2024', // Change this to your preferred password
  SESSION_SECRET: 'your-session-secret-change-this', // Change in production

  // Server
  PORT: process.env.PORT || 3100,

  // Paths
  CONTENT_DIR: './content',

  // Session timeout (30 days for kiosk machines)
  SESSION_MAX_AGE: 30 * 24 * 60 * 60 * 1000,

  // Supported file types
  SUPPORTED_TYPES: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    documents: ['.pdf'],
    text: ['.txt', '.md'],
    video: ['.mp4', '.webm', '.ogg'],
    audio: ['.mp3', '.wav', '.ogg']
  }
};
