import { Injectable } from '@nestjs/common';
import { MessageAttachment } from '../schema/message.schema';
import {
  CloudinaryStorageService,
  CloudinaryUploadFile,
} from '../common/cloudinary-storage.service';

export type ChatUploadedFile = CloudinaryUploadFile;

@Injectable()
export class ChatAttachmentService {
  constructor(private readonly cloudinaryStorage: CloudinaryStorageService) {}

  async uploadFiles(
    files: ChatUploadedFile[],
    folder = 'chat-attachments',
  ): Promise<MessageAttachment[]> {
    return this.cloudinaryStorage.uploadFiles(files, folder);
  }

  async deleteFiles(files: MessageAttachment[]): Promise<void> {
    return this.cloudinaryStorage.deleteFiles(files);
  }
}
