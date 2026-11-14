import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatUploadedFile } from '../chat/chat-attachment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { SocialService } from './social.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

const allowedPostAttachmentTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('/blog')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: {
        content: { type: 'string', maxLength: 280 },
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
        if (!allowedPostAttachmentTypes.has(file.mimetype)) {
          callback(
            new BadRequestException('Post attachments must be an image or PDF'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  createPost(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: { attachments?: ChatUploadedFile[] },
  ) {
    return this.socialService.createPost(
      req.user.userId,
      dto,
      files?.attachments ?? [],
    );
  }

  @Get('/')
  listPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.socialService.listPosts(Number(page), Number(limit), authorId);
  }

  @Get('/blog/:postId')
  getPost(@Param('postId') postId: string) {
    return this.socialService.getPost(postId);
  }

  @Patch('/blog/:postId')
  updatePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.socialService.updatePost(req.user.userId, postId, dto);
  }

  @Delete('/blog/:postId')
  deletePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
  ) {
    return this.socialService.deletePost(req.user.userId, postId);
  }

  @Post('/blog/:postId/likes')
  likePost(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    return this.socialService.setLike(req.user.userId, postId, true);
  }

  @Delete('/blog/:postId/likes')
  unlikePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
  ) {
    return this.socialService.setLike(req.user.userId, postId, false);
  }

  @Get('/blog/:postId/comments')
  listComments(
    @Param('postId') postId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.listComments(postId, Number(page), Number(limit));
  }

  @Post('/blog/:postId/comments')
  createComment(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.createComment(req.user.userId, postId, dto);
  }

  @Delete('/blog/comments/:commentId')
  deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    return this.socialService.deleteComment(req.user.userId, commentId);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('social')
export class SocialRelationsController {
  constructor(private readonly socialService: SocialService) {}

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.search(query, Number(page), Number(limit));
  }

  @Post('users/:userId/follow')
  follow(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.socialService.follow(req.user.userId, userId);
  }

  @Delete('users/:userId/follow')
  unfollow(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    return this.socialService.unfollow(req.user.userId, userId);
  }

  @Get('users/:userId/followers')
  followers(@Param('userId') userId: string) {
    return this.socialService.listFollowRelations(userId, 'followers');
  }

  @Get('users/:userId/following')
  following(@Param('userId') userId: string) {
    return this.socialService.listFollowRelations(userId, 'following');
  }

  @Get('users/follow-relations')
  fetchAllFollowRelations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.fetchAllFollowRelations(
      Number(page),
      Number(limit),
    );
  }

  @Get('users/:userId/posts')
  userPosts(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.listPosts(Number(page), Number(limit), userId);
  }

  // @Get('chat/conversations')
  // conversations(@Req() req: AuthenticatedRequest) {
  //   return this.socialService.listConversations(req.user.userId);
  // }

  // @Get('chat/:userId/messages')
  // messages(
  //   @Req() req: AuthenticatedRequest,
  //   @Param('userId') userId: string,
  //   @Query('page') page?: string,
  //   @Query('limit') limit?: string,
  // ) {
  //   return this.socialService.listMessages(
  //     req.user.userId,
  //     userId,
  //     Number(page),
  //     Number(limit),
  //   );
  // }

  // @Post('chat/:userId/messages')
  // sendMessage(
  //   @Req() req: AuthenticatedRequest,
  //   @Param('userId') userId: string,
  //   @Body() dto: CreateMessageDto,
  // ) {
  //   return this.socialService.sendMessage(req.user.userId, userId, dto);
  // }
}
