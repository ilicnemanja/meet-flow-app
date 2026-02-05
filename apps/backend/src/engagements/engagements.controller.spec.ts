import { Test, TestingModule } from '@nestjs/testing';
import { EngagementsController } from './engagements.controller';
import { EngagementsService } from './engagements.service';

describe('EngagementsController', () => {
  let controller: EngagementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngagementsController],
      providers: [EngagementsService],
    }).compile();

    controller = module.get<EngagementsController>(EngagementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
