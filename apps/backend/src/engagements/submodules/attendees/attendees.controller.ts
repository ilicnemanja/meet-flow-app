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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AttendeesService } from './attendees.service';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { QueryAttendeeDto } from './dto/query-attendee.dto';
import { EngagementAttendee } from './entities/attendee.entity';

@ApiTags('Engagement Attendees')
@Controller('engagements/:engagementId/attendees')
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @Post()
  @ApiOperation({ summary: 'Add an attendee to an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Attendee added successfully',
    type: EngagementAttendee,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  create(
    @Param('engagementId') engagementId: string,
    @Body() createAttendeeDto: CreateAttendeeDto,
  ) {
    return this.attendeesService.create(engagementId, createAttendeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attendees for an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of attendees',
  })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  findAll(
    @Param('engagementId') engagementId: string,
    @Query() query: QueryAttendeeDto,
  ) {
    return this.attendeesService.findAll(engagementId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an attendee by ID' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiParam({ name: 'id', description: 'Attendee ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Returns the attendee',
    type: EngagementAttendee,
  })
  @ApiResponse({ status: 404, description: 'Attendee not found' })
  findOne(
    @Param('engagementId') engagementId: string,
    @Param('id') id: string,
  ) {
    return this.attendeesService.findOne(engagementId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attendee' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiParam({ name: 'id', description: 'Attendee ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Attendee updated successfully',
    type: EngagementAttendee,
  })
  @ApiResponse({ status: 404, description: 'Attendee not found' })
  update(
    @Param('engagementId') engagementId: string,
    @Param('id') id: string,
    @Body() updateAttendeeDto: UpdateAttendeeDto,
  ) {
    return this.attendeesService.update(engagementId, id, updateAttendeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an attendee from an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiParam({ name: 'id', description: 'Attendee ID', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Attendee removed successfully' })
  @ApiResponse({ status: 404, description: 'Attendee not found' })
  remove(@Param('engagementId') engagementId: string, @Param('id') id: string) {
    return this.attendeesService.remove(engagementId, id);
  }
}
