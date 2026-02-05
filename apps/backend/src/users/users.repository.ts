import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findAll(
    query: QueryUserDto,
  ): Promise<{ data: User[]; totalCount: number }> {
    const where: any = {};

    if (query.firstName) {
      where.firstName = ILike(`%${query.firstName}%`);
    }
    if (query.lastName) {
      where.lastName = ILike(`%${query.lastName}%`);
    }
    if (query.email) {
      where.email = ILike(`%${query.email}%`);
    }
    if (query.search) {
      where.firstName = ILike(`%${query.search}%`);
    }

    const [data, totalCount] = await this.repository.findAndCount({
      where,
      skip: query.offset,
      take: query.limit,
      order: { createdAt: 'DESC' },
    });

    return { data, totalCount };
  }

  async findOne(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.repository.create(dto);
    return this.repository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    await this.repository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }
}
