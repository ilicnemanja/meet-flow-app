import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EngagementEvent } from './entities/event.entity';

@ApiTags('Engagement Event')
@Controller('engagements/:engagementId/event')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an event for an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EngagementEvent,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Engagement not found' })
  create(
    @Param('engagementId') engagementId: string,
    @Body() createEventDto: CreateEventDto,
  ) {
    return this.eventsService.create(engagementId, createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the event for an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the event',
    type: EngagementEvent,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('engagementId') engagementId: string) {
    return this.eventsService.findOne(engagementId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the event for an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EngagementEvent,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(
    @Param('engagementId') engagementId: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(engagementId, updateEventDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the event for an engagement' })
  @ApiParam({
    name: 'engagementId',
    description: 'Engagement ID',
    format: 'uuid',
  })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  remove(@Param('engagementId') engagementId: string) {
    return this.eventsService.remove(engagementId);
  }
}
