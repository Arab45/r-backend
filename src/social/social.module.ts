import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';
import { Comment, CommentSchema } from '../schema/comment.schema';
import { Follow, FollowSchema } from '../schema/follow.schema';
import { Message, MessageSchema } from '../schema/message.schema';
import { Post, PostSchema } from '../schema/post.schema';
import { User, UserSchema } from '../schema/user.schema';
import {
  SocialController,
  SocialRelationsController,
} from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SocialController, SocialRelationsController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
