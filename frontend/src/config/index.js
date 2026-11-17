// src/config/index.js
const config = {
  api: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    timeout: 10000,
  },
  google: {
    clientId:
      process.env.REACT_APP_GOOGLE_CLIENT_ID ||
      '1083016507594-5ouvmeorufmvv31fulddfg51qherloqb.apps.googleusercontent.com',
  },
};

export default config;