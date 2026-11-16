import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryStorageModule } from '../common/cloudinary-storage.module';
import { User, UserSchema } from '../schema/user.schema';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    CloudinaryStorageModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
