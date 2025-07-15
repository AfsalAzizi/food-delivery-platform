declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production" | "test";
      PORT: string;
      MONGODB_URL: string;
      RABBITMQ_URL: string;
      JWT_SECRET?: string;
    }
  }
}

export {};
