import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatUploadedFile } from './chat-attachment.service';
import { ChatService } from './chat.service';
import { CreateChatDto, SendChatMessageDto } from './dto/chat.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

const allowedAttachmentTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createChat(@Req() req: AuthenticatedRequest, @Body() dto: CreateChatDto) {
    return this.chatService.createChat(req.user.userId, dto.recipientId);
  }

  @Get(':userId')
  getChats(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    if (userId !== req.user.userId) {
      throw new ForbiddenException('You can only access your own chats');
    }
    return this.chatService.getChats(req.user.userId);
  }

  @Get('chat/:chatId')
  getChatById(
    @Req() req: AuthenticatedRequest,
    @Param('chatId') chatId: string,
  ) {
    return this.chatService.getChatById(req.user.userId, chatId);
  }

  @Post(':chatId/messages')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', maxLength: 5000 },
        attachments: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'attachments', maxCount: 5 }], {
      limits: { fileSize: 10 * 1024 * 1024, files: 5 },
      fileFilter: (_request, file, callback) => {
        if (!allowedAttachmentTypes.has(file.mimetype)) {
          callback(
            new BadRequestException('Unsupported attachment file type'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('chatId') chatId: string,
    @Body() dto: SendChatMessageDto,
    @UploadedFiles()
    files: { attachments?: ChatUploadedFile[] },
  ) {
    return this.chatService.sendChatMessage(
      req.user.userId,
      chatId,
      dto.content,
      files?.attachments ?? [],
    );
  }

  @Get(':chatId/messages')
  getMessages(
    @Req() req: AuthenticatedRequest,
    @Param('chatId') chatId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      req.user.userId,
      chatId,
      Number(page),
      Number(limit),
    );
  }
}
