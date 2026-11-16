import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface CloudinaryAsset {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
  resourceType: string;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadFiles(
    files: CloudinaryUploadFile[],
    folder: string,
  ): Promise<CloudinaryAsset[]> {
    const uploaded: CloudinaryAsset[] = [];
    try {
      for (const file of files) {
        uploaded.push(await this.uploadFile(file, folder));
      }
      return uploaded;
    } catch (error) {
      await this.deleteFiles(uploaded);
      throw error;
    }
  }

  async uploadFile(
    file: CloudinaryUploadFile,
    folder: string,
  ): Promise<CloudinaryAsset> {
    this.configure();
    const response = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
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
      upload.end(file.buffer);
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

  async deleteFiles(
    files: Pick<CloudinaryAsset, 'publicId' | 'resourceType'>[],
  ): Promise<void> {
    this.configure();
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

  private configure(): void {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'Cloudinary uploads are not configured',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error !== 'object' || error === null) {
      return typeof error === 'string' ? error : 'unknown error';
    }

    const details = error as Record<string, unknown>;
    const message =
      typeof details.message === 'string'
        ? details.message
        : typeof details.error === 'string'
          ? details.error
          : undefined;
    const status =
      typeof details.http_code === 'number'
        ? ` (HTTP ${details.http_code})`
        : '';
    return message
      ? `${message}${status}`
      : 'Cloudinary returned an unknown error';
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
