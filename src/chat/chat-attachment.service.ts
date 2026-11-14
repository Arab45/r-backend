import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { MessageAttachment } from '../schema/message.schema';

export interface ChatUploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class ChatAttachmentService {
  private readonly logger = new Logger(ChatAttachmentService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadFiles(files: ChatUploadedFile[]): Promise<MessageAttachment[]> {
    const uploaded: MessageAttachment[] = [];
    try {
      for (const file of files) {
        uploaded.push(await this.uploadFile(file));
      }
      return uploaded;
    } catch (error) {
      await this.deleteFiles(uploaded);
      throw error;
    }
  }

  async deleteFiles(files: MessageAttachment[]): Promise<void> {
    for (const file of files) {
      try {
        const result: unknown = await cloudinary.uploader.destroy(
          file.publicId,
          {
            resource_type: file.resourceType as 'image' | 'video' | 'raw',
          },
        );
        if (
          !this.isDestroyResult(result) ||
          (result.result !== 'ok' && result.result !== 'not found')
        ) {
          this.logger.error(
            `Cloudinary cleanup failed for ${file.publicId}: unexpected response`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Cloudinary cleanup failed for ${file.publicId}: ${this.errorMessage(error)}`,
        );
      }
    }
  }

  private async uploadFile(file: ChatUploadedFile): Promise<MessageAttachment> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'Chat file uploads are not configured',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const response = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'chat-attachments',
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary upload failed: ${this.errorMessage(error)}`,
            );
            reject(
              new ServiceUnavailableException('Unable to upload attachment'),
            );
            return;
          }
          if (!result) {
            reject(
              new ServiceUnavailableException(
                'Cloudinary returned no upload result',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });

    return {
      url: response.secure_url,
      publicId: response.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: response.bytes,
      resourceType: response.resource_type,
    };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }

  private isDestroyResult(result: unknown): result is { result: string } {
    return (
      typeof result === 'object' &&
      result !== null &&
      'result' in result &&
      typeof result.result === 'string'
    );
  }
}
