import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { Comment, CommentSchema } from 'src/schema/comment.schema';
import { Follow, FollowSchema } from 'src/schema/follow.schema';
import { Message, MessageSchema } from 'src/schema/message.schema';
import { Post, PostSchema } from 'src/schema/post.schema';
import { User, UserSchema } from 'src/schema/user.schema';
import {
  SocialController,
  SocialRelationsController,
} from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    AuthModule,
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
