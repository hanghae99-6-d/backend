import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { CommentException } from './comment.exception';
import { CommentRepository } from './comment.repository';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentRepository)
    private readonly commentRepository: CommentRepository,
    private readonly commentException: CommentException,
    private readonly connection: Connection,
  ) {}

  // 그룹 댓글 존재 여부 확인
  private async findComment(commentId: number) {
    const comment = await this.commentRepository.findOne(commentId);
    if (!comment) {
      this.commentException.NotFound();
    }
    return comment.childComments;
  }

  // 그룹 댓글 접근 권한 확인
  private async accessComment(userId: string, commentId: number) {
    const comment = await this.commentRepository.findOne({ userId, commentId });
    if (!comment) {
      this.commentException.AccessDenined();
    }
    return comment;
  }

  // 그룹 댓글 조회
  async getGroupComments(groupId: string, offset: number) {
    const rows = await this.commentRepository.findCommentByGroupId(
      groupId,
      offset,
    );
    const comments = rows.map((row) => {
      const comment = row as any;
      comment.user = row.userId;
      delete comment.userId;
      return comment;
    });
    return { comments };
  }

  // 그룹 댓글 작성
  async createGroupComment(
    groupId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ) {
    await this.commentRepository.createGroupComment(
      groupId,
      userId,
      createCommentDto,
    );
  }

  // 하위 댓글 조회
  async getChildComments(groupId: string, parentId: number, offset: number) {
    await this.findComment(parentId);
    const rows = await this.commentRepository.findChildComments(
      groupId,
      parentId,
      offset,
    );
    const comments = rows.map((row) => {
      const comment = row as any;
      comment.user = row.userId;
      delete comment.userId;
      return comment;
    });
    return { comments };
  }

  // 하위 댓글 작성
  async createChildComment(
    groupId: string,
    parentId: number,
    userId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const childComments = await this.findComment(parentId);

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let error = null;
    try {
      // 하위 comment 등록
      await this.commentRepository.createChildCommentTransaction(
        queryRunner,
        groupId,
        parentId,
        createCommentDto,
      );
      // 상위 comment의 childComments += 1
      await this.commentRepository.increaseChildCommentCountTransaction(
        queryRunner,
        parentId,
        childComments + 1,
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      error = e;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

    if (error) {
      this.commentException.Transaction();
    }
  }

  // 댓글 수정
  async updateComment(
    userId: string,
    commentId: number,
    updateCommentDto: UpdateCommentDto,
  ) {
    await this.accessComment(userId, commentId);
    await this.commentRepository.updateComment(commentId, updateCommentDto);
  }

  // 댓글 삭제
  async deleteComment(userId: string, commentId: number) {
    await this.accessComment(userId, commentId);
    await this.commentRepository.deleteComment(commentId);
  }
}
