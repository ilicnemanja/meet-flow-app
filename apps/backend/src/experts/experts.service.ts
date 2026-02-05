import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpertsRepository } from './expets.repository';
import { QueryExpertDto } from './dto/query-expert.dto';
import { PaginatedResponseDto } from '../common/db/base-query-dto';
import { Expert } from './entities/expert.entity';

@Injectable()
export class ExpertsService {
  constructor(private readonly expertsRepository: ExpertsRepository) {}

  async findAll(query: QueryExpertDto): Promise<PaginatedResponseDto<Expert>> {
    const { data, totalCount } = await this.expertsRepository.findAll(query);
    return new PaginatedResponseDto(data, totalCount, query);
  }

  async findOne(id: string): Promise<Expert> {
    const expert = await this.expertsRepository.findOne(id);
    if (!expert) {
      throw new NotFoundException(`Expert with ID "${id}" not found`);
    }
    return expert;
  }
}
