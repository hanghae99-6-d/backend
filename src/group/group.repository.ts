import { GroupTime } from 'src/common/interface';
import { EntityRepository, Repository } from 'typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './group.entity';

@EntityRepository(Group)
export class GroupRepository extends Repository<Group> {
  // 그룹 생성
  async createGroup(userId: number, createGroupDto: CreateGroupDto) {
    const { groupId } = await this.save({
      host: userId,
      ...createGroupDto,
    });
    return { groupId };
  }

  // 그룹 수정
  async updateGroup(groupId: number, updateGroupDto: UpdateGroupDto) {
    await this.update(groupId, updateGroupDto);
  }

  // 그룹 삭제
  async deleteGroup(groupId: number) {
    await this.softDelete(groupId);
  }

  // 그룹 상세 정보 조회
  async findGroupInfo(groupId: number) {
    const group = await this.createQueryBuilder('group')
      .select([
        'group.groupId',
        'group.title',
        'group.description',
        'group.menu',
        'group.placeName',
        'group.imageUrl',
        'group.startAt',
        'group.endAt',
        'group.limit',
        'group.locationX',
        'group.locationY',
        'group.address',
        'group.createdAt',
        'group.updatedAt',
      ])
      .leftJoin('group.host', 'host')
      .addSelect([
        'host.userId',
        'host.nickname',
        'host.careerId',
        'host.year',
        'host.description',
        'host.profileImageUrl',
      ])
      .leftJoinAndSelect('group.guests', 'guests')
      .leftJoin('guests.guest', 'guest')
      .addSelect([
        'guest.userId',
        'guest.nickname',
        'guest.year',
        'guest.careerId',
        'guest.description',
        'guest.profileImageUrl',
      ])
      .where('group.groupId = :groupId', { groupId })
      .getOne();
    return group;
  }

  // 오늘 참여 그룹 목록 조회
  async findTodayGroups(userId: number) {
    const groups = await this.createQueryBuilder('groups')
      .select([
        'groups.groupId',
        'groups.title',
        'groups.menu',
        'groups.placeName',
        'groups.limit',
        'groups.imageUrl',
        'groups.startAt',
        'groups.endAt',
      ])
      .leftJoin('groups.host', 'host')
      .addSelect([
        'host.userId',
        'host.nickname',
        'host.careerId',
        'host.year',
        'host.description',
        'host.profileImageUrl',
      ])
      .leftJoin('groups.guests', 'guests')
      .addSelect(['guests.id'])
      .where('groups.host.userId = :userId', { userId })
      .orWhere(':userId IN (SELECT guest from group_users)', { userId })
      .andWhere('groups.startAt > :today', { today: new Date() })
      .orderBy('groups.startAt', 'DESC')
      .getMany();

    return groups.map((group) => {
      const row = {
        ...group,
        join: group.guests.length + 1,
      };
      delete row.guests;
      return row;
    });
  }

  // 조건에 따른 그룹 목록 조회
  // 시간대 추가할 것
  async findGroupsByQuery(
    x: number,
    y: number,
    offset?: number,
    time?: GroupTime,
  ) {
    const index = offset ? offset : 0;
    const limit = offset ? 8 : 4;
    let today: Date;
    switch (time) {
      case 'lunch':
        today = new Date();
        break;
      case 'dinner':
        today = new Date();
        break;
      default:
        today = new Date();
        break;
    }

    return await this.createQueryBuilder('groups')
      .select([
        'groups.groupId',
        'groups.title',
        'groups.menu',
        'groups.placeName',
        'groups.limit',
        'groups.imageUrl',
        'groups.startAt',
        'groups.endAt',
      ])
      .leftJoin('groups.host', 'host')
      .addSelect([
        'host.userId',
        'host.nickname',
        'host.careerId',
        'host.year',
        'host.description',
        'host.profileImageUrl',
      ])
      .leftJoin('groups.guests', 'guests')
      .addSelect(['guests.id'])
      .where('groups.groupId > :index', { index })
      // 시간 조건 추가할 것
      // .andWhere('groups.startAt > :today', { today })
      .orderBy('groups.startAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  // 사용자가 참여한 모든 그룹 조회
  async findGroupsByUserId(userId: number, offset?: number) {
    const index = offset ? offset : 0;
    const limit = offset ? 8 : 4;
    const groups = await this.createQueryBuilder('groups')
      .select([
        'groups.groupId',
        'groups.title',
        'groups.menu',
        'groups.placeName',
        'groups.limit',
        'groups.imageUrl',
        'groups.startAt',
        'groups.endAt',
      ])
      .leftJoin('groups.host', 'host')
      .addSelect([
        'host.userId',
        'host.nickname',
        'host.careerId',
        'host.year',
        'host.description',
        'host.profileImageUrl',
      ])
      .leftJoin('groups.guests', 'guests')
      .addSelect(['guests.id'])
      .where('groups.host.userId = :userId', { userId })
      .andWhere('groups.groupId > :index', { index })
      .orderBy('groups.startAt', 'DESC')
      .limit(limit)
      .getMany();

    return groups.map((group) => {
      const row = {
        ...group,
        join: group.guests.length + 1,
      };
      delete row.guests;
      return row;
    });
  }
}
