export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || 'meetflow',
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    tenantId: process.env.MICROSOFT_TENANT_ID,
    redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    authority: `https://login.microsoftonline.com/consumers`,
    scopes: [
      'user.read',
      'openid',
      'profile',
      'email',
      'offline_access',
      'Calendars.ReadWrite',
    ],
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: 86400,
  },
  frontend: {
    url: process.env.FRONTEND_URL,
    redirectUri: process.env.FRONTEND_REDIRECT_URI,
  },
});
