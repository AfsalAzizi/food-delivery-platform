import express, { Application, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

const app: Application = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("👋 User Service is running with TypeScript");
});

app.use("/auth", authRoutes);
app.use("/user", userRoutes);

export default app;
