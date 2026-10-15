import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { SocialService } from './social.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  createPost(@Req() req: AuthenticatedRequest, @Body() dto: CreatePostDto) {
    return this.socialService.createPost(req.user.userId, dto);
  }

  @Get()
  listPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.socialService.listPosts(Number(page), Number(limit), authorId);
  }

  @Get(':postId')
  getPost(@Param('postId') postId: string) {
    return this.socialService.getPost(postId);
  }

  @Patch(':postId')
  updatePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.socialService.updatePost(req.user.userId, postId, dto);
  }

  @Delete(':postId')
  deletePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
  ) {
    return this.socialService.deletePost(req.user.userId, postId);
  }

  @Post(':postId/likes')
  likePost(@Req() req: AuthenticatedRequest, @Param('postId') postId: string) {
    return this.socialService.setLike(req.user.userId, postId, true);
  }

  @Delete(':postId/likes')
  unlikePost(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
  ) {
    return this.socialService.setLike(req.user.userId, postId, false);
  }

  @Get(':postId/comments')
  listComments(
    @Param('postId') postId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.listComments(postId, Number(page), Number(limit));
  }

  @Post(':postId/comments')
  createComment(
    @Req() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.createComment(req.user.userId, postId, dto);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    return this.socialService.deleteComment(req.user.userId, commentId);
  }
}

@ApiTags('social')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
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

  @Get('users/:userId/posts')
  userPosts(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.listPosts(Number(page), Number(limit), userId);
  }

  @Get('chat/conversations')
  conversations(@Req() req: AuthenticatedRequest) {
    return this.socialService.listConversations(req.user.userId);
  }

  @Get('chat/:userId/messages')
  messages(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialService.listMessages(
      req.user.userId,
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Post('chat/:userId/messages')
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.socialService.sendMessage(req.user.userId, userId, dto);
  }
}
