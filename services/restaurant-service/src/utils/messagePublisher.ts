import { RestaurantEvent } from "@/types";
import * as amqp from "amqplib";

class MessagePublisher {
  private connection: any = null;
  private channel: any = null;
  private readonly exchangeName = "food_delivery_events";

  async connect(): Promise<void> {
    try {
      const rabbitmqUrl =
        process.env.RABBITMQ_URL ||
        "ampqp://admin@secure_rabbitmq_pass_123@rabbitmq:5672";

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      console.log("📨 Restaurant Message Publisher connected to RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      process.exit(1);
    }
  }

  async publishMessage(eventType: string, data: any): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error("RabbitMQ channel not initialized");
      }

      const event: RestaurantEvent = {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: "restaurant-service",
      };

      const routingKey = eventType;

      const published = this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(event))
      );

      if (published) {
        console.log(`📤 Published event: ${eventType}`);
      } else {
        console.log(`❌ Failed to publish event: ${eventType}`);
      }
    } catch (error) {
      console.error("❌ Failed to publish message:", error);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("📨 Restaurant Message Publisher disconnected from RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to close RabbitMQ connection:", error);
    }
  }
}

export default new MessagePublisher();
