import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { EngagementsService } from './engagements.service';
import { CreateEngagementDto } from './dto/create-engagement.dto';
import { UpdateEngagementDto } from './dto/update-engagement.dto';
import { QueryEngagementDto } from './dto/query-engagement.dto';
import { Engagement } from './entities/engagement.entity';

@ApiTags('Engagements')
@Controller('engagements')
export class EngagementsController {
  constructor(private readonly engagementsService: EngagementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new engagement' })
  @ApiResponse({
    status: 201,
    description: 'Engagement created successfully',
    type: Engagement,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createEngagementDto: CreateEngagementDto) {
    return this.engagementsService.create(createEngagementDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all engagements with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of engagements',
  })
  findAll(@Query() query: QueryEngagementDto) {
    return this.engagementsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an engagement by ID' })
  @ApiParam({ name: 'id', description: 'Engagement ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Returns the engagement',
    type: Engagement,
  })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  findOne(@Param('id') id: string) {
    return this.engagementsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an engagement' })
  @ApiParam({ name: 'id', description: 'Engagement ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Engagement updated successfully',
    type: Engagement,
  })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  update(
    @Param('id') id: string,
    @Body() updateEngagementDto: UpdateEngagementDto,
  ) {
    return this.engagementsService.update(id, updateEngagementDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an engagement' })
  @ApiParam({ name: 'id', description: 'Engagement ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Engagement deleted successfully' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  remove(@Param('id') id: string) {
    return this.engagementsService.remove(id);
  }
}
