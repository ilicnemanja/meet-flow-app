import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExpertsService } from './experts.service';
import { QueryExpertDto } from './dto/query-expert.dto';
import { Expert } from './entities/expert.entity';

@ApiTags('Experts')
@Controller('experts')
export class ExpertsController {
  constructor(private readonly expertsService: ExpertsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all experts with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of experts',
  })
  findAll(@Query() query: QueryExpertDto) {
    return this.expertsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an expert by ID' })
  @ApiParam({ name: 'id', description: 'Expert ID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Returns the expert', type: Expert })
  @ApiResponse({ status: 404, description: 'Expert not found' })
  findOne(@Param('id') id: string) {
    return this.expertsService.findOne(id);
  }
}
