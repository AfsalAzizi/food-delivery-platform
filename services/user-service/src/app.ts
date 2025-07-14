import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import { messagePublisher } from "./utils/messagePublisher";

const app: Application = express();

app.use(cors());
app.use(express.json());

messagePublisher.connect().catch((error) => {
  console.error("❌ Failed to connect to RabbitMQ:", error);
});

process.on("SIGINT", async () => {
  await messagePublisher.close();
  process.exit(0);
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "user-service",
    timeStamp: new Date().toISOString(),
  });
});

app.get("/", (_req: Request, res: Response) => {
  res.send("👋 User Service is running with TypeScript");
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);

export default app;
