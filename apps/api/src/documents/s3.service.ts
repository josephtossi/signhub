import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get("S3_BUCKET", "signhub");
    this.client = new S3Client({
      region: this.config.get("AWS_REGION", "us-east-1"),
      endpoint: this.config.get("S3_ENDPOINT"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get("AWS_ACCESS_KEY_ID", "minio"),
        secretAccessKey: this.config.get("AWS_SECRET_ACCESS_KEY", "minio123")
      }
    });
  }

  async upload(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
    return { key, bucket: this.bucket };
  }

  async getObject(key: string) {
    const output = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    );
    const bytes = await output.Body?.transformToByteArray();
    return {
      body: Buffer.from(bytes || []),
      contentType: output.ContentType || "application/octet-stream"
    };
  }
}
