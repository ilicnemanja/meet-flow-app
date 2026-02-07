import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { UpsertSubscriptionDto } from './dto/upsert-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

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
  upsert(
    @Body() upsertSubscriptionDto: UpsertSubscriptionDto,
    @CurrentUser() user: { microsoftHomeAccountId: string },
  ) {
    return this.subscriptionsService.upsert(
      upsertSubscriptionDto,
      user.microsoftHomeAccountId,
    );
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
