import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from 'src/controller/user.controller';
import { Career } from 'src/entity/career.entity';
import { User } from 'src/entity/user.entity';
import { UserService } from 'src/service/user.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, Career])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
