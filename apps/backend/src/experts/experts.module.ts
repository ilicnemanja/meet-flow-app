import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpertsService } from './experts.service';
import { ExpertsController } from './experts.controller';
import { ExpertsRepository } from './expets.repository';
import { Expert } from './entities/expert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Expert])],
  controllers: [ExpertsController],
  providers: [ExpertsService, ExpertsRepository],
  exports: [ExpertsService],
})
export class ExpertsModule {}
