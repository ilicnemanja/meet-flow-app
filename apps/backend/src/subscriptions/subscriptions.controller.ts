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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { Subscription } from './entities/subscription.entity';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    type: Subscription,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all subscriptions with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of subscriptions',
  })
  findAll(@Query() query: QuerySubscriptionDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Returns the subscription',
    type: Subscription,
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Subscription updated successfully',
    type: Subscription,
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiParam({ name: 'id', description: 'Subscription ID', format: 'uuid' })
  @ApiResponse({
    status: 204,
    description: 'Subscription deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
