import * as amqp from "amqplib";

class MessagePublisher {
  private connection: any = null;
  private channel: any = null;
  private readonly exchangeName = "food_delivery_events";

  async connect(): Promise<void> {
    try {
      const rabbitmqUrl =
        process.env.RABBITMQ_URL ||
        "amqp://admin:secure_rabbitmq_pass_123@rabbitmq:5672";

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      console.log("📨 Message Publisher connected to RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  async publishMessage(eventType: string, data: any): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    try {
      const event = {
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: "user-service",
      };

      const routingKey = eventType;

      const published = this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          messageId: `${eventType}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
        }
      );

      if (published) {
        console.log(`📤 Published event: ${eventType}`);
      } else {
        console.log(`❌ Failed to publish event: ${eventType}`);
      }
    } catch (error) {
      console.error("❌ Failed to publish event:", error);
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

      console.log("📨 Message Publisher disconnected from RabbitMQ");
    } catch (error) {
      console.error("❌ Failed to close connection:", error);
    }
  }
}

export const messagePublisher = new MessagePublisher();
