import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment } from 'src/schema/comment.schema';
import { Follow } from 'src/schema/follow.schema';
import { Message } from 'src/schema/message.schema';
import { Post } from 'src/schema/post.schema';
import { User } from 'src/schema/user.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';

@Injectable()
export class SocialService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    @InjectModel(Follow.name) private readonly followModel: Model<Follow>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async createPost(userId: string, dto: CreatePostDto) {
    this.assertObjectId(userId);
    return this.postModel.create({ ...dto, author: userId });
  }

  async listPosts(page = 1, limit = 20, authorId?: string) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const filter: Record<string, unknown> = {};
    if (authorId) {
      this.assertObjectId(authorId);
      filter.author = authorId;
    }

    const [posts, total] = await Promise.all([
      this.postModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('author', 'fullName username')
        .exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    return { posts, total, page: safePage, limit: safeLimit };
  }

  async search(query: string, page = 1, limit = 20) {
    const term = query?.trim();
    if (!term) throw new BadRequestException('Search query is required');
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const expression = new RegExp(this.escapeRegex(term), 'i');
    const [posts, postCount, users, userCount] = await Promise.all([
      this.postModel
        .find({ content: expression })
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('author', 'fullName username')
        .exec(),
      this.postModel.countDocuments({ content: expression }).exec(),
      this.userModel
        .find({ $or: [{ fullName: expression }, { username: expression }] })
        .select('fullName username institution fieldOfStudy bio areaOfInterest')
        .sort({ fullName: 1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.userModel
        .countDocuments({
          $or: [{ fullName: expression }, { username: expression }],
        })
        .exec(),
    ]);
    return {
      posts,
      postCount,
      users,
      userCount,
      page: safePage,
      limit: safeLimit,
    };
  }

  async follow(followerId: string, targetId: string) {
    this.assertObjectId(followerId);
    this.assertObjectId(targetId);
    if (followerId === targetId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    const target = await this.userModel.exists({ _id: targetId });
    if (!target) throw new NotFoundException('User not found');
    await this.followModel
      .updateOne(
        { follower: followerId, following: targetId },
        { $setOnInsert: { follower: followerId, following: targetId } },
        { upsert: true },
      )
      .exec();
    return { following: true };
  }

  async unfollow(followerId: string, targetId: string) {
    this.assertObjectId(followerId);
    this.assertObjectId(targetId);
    await this.followModel
      .deleteOne({ follower: followerId, following: targetId })
      .exec();
    return { following: false };
  }

  async listFollowRelations(
    userId: string,
    direction: 'followers' | 'following',
  ) {
    this.assertObjectId(userId);
    const field = direction === 'followers' ? 'follower' : 'following';
    const relationField = direction === 'followers' ? 'following' : 'follower';
    const relations = await this.followModel
      .find({ [field]: userId })
      .populate(relationField, 'fullName username institution fieldOfStudy bio')
      .sort({ createdAt: -1 })
      .exec();
    return relations.map((relation) => relation.get(relationField));
  }

  async sendMessage(
    senderId: string,
    recipientId: string,
    dto: CreateMessageDto,
  ) {
    this.assertObjectId(senderId);
    this.assertObjectId(recipientId);
    if (senderId === recipientId) {
      throw new BadRequestException('You cannot message yourself');
    }
    const recipient = await this.userModel.exists({ _id: recipientId });
    if (!recipient) throw new NotFoundException('User not found');
    return this.messageModel
      .create({
        sender: senderId,
        recipient: recipientId,
        content: dto.content,
      })
      .then((message) =>
        message.populate('sender recipient', 'fullName username'),
      );
  }

  async listMessages(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50,
  ) {
    this.assertObjectId(userId);
    this.assertObjectId(otherUserId);
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const filter = {
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
      ],
    };
    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('sender recipient', 'fullName username')
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);
    return {
      messages: messages.reverse(),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async listConversations(userId: string) {
    this.assertObjectId(userId);
    const messages = await this.messageModel
      .find({ $or: [{ sender: userId }, { recipient: userId }] })
      .sort({ createdAt: -1 })
      .populate('sender recipient', 'fullName username')
      .exec();
    const latestByUser = new Map<string, Message>();
    for (const message of messages) {
      const sender = message.sender as unknown as User;
      const recipient = message.recipient as unknown as User;
      const peer = sender._id.toString() === userId ? recipient : sender;
      if (!latestByUser.has(peer._id.toString()))
        latestByUser.set(peer._id.toString(), message);
    }
    return [...latestByUser.values()];
  }

  async getPost(postId: string) {
    this.assertObjectId(postId);
    const post = await this.postModel
      .findById(postId)
      .populate('author', 'fullName username')
      .exec();
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.getOwnedPost(userId, postId);
    Object.assign(post, dto);
    return post.save();
  }

  async deletePost(userId: string, postId: string) {
    await this.getOwnedPost(userId, postId);
    await Promise.all([
      this.postModel.findByIdAndDelete(postId).exec(),
      this.commentModel.deleteMany({ post: postId }).exec(),
    ]);
    return { deleted: true };
  }

  async setLike(userId: string, postId: string, liked: boolean) {
    this.assertObjectId(userId);
    this.assertObjectId(postId);
    const update = liked
      ? { $addToSet: { likes: userId } }
      : { $pull: { likes: userId } };
    const post = await this.postModel
      .findByIdAndUpdate(postId, update, {
        new: true,
        projection: { likes: 1 },
      })
      .exec();
    if (!post) throw new NotFoundException('Post not found');
    return { liked, likeCount: post.likes.length };
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    this.assertObjectId(userId);
    this.assertObjectId(postId);
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException('Post not found');

    const comment = await this.commentModel.create({
      ...dto,
      author: userId,
      post: postId,
    });
    await this.postModel
      .updateOne({ _id: postId }, { $inc: { commentCount: 1 } })
      .exec();
    return comment.populate('author', 'fullName username');
  }

  async listComments(postId: string, page = 1, limit = 20) {
    this.assertObjectId(postId);
    const exists = await this.postModel.exists({ _id: postId });
    if (!exists) throw new NotFoundException('Post not found');
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const [comments, total] = await Promise.all([
      this.commentModel
        .find({ post: postId })
        .sort({ createdAt: 1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('author', 'fullName username')
        .exec(),
      this.commentModel.countDocuments({ post: postId }).exec(),
    ]);
    return { comments, total, page: safePage, limit: safeLimit };
  }

  async deleteComment(userId: string, commentId: string) {
    this.assertObjectId(userId);
    this.assertObjectId(commentId);
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    const result = await comment.deleteOne();
    if (result.deletedCount) {
      await this.postModel
        .updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } })
        .exec();
    }
    return { deleted: true };
  }

  private async getOwnedPost(userId: string, postId: string) {
    this.assertObjectId(userId);
    this.assertObjectId(postId);
    const post = await this.postModel.findById(postId).exec();
    if (!post) throw new NotFoundException('Post not found');
    if (post.author.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    return post;
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID');
    }
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
