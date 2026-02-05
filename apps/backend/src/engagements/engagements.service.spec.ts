import { Test, TestingModule } from '@nestjs/testing';
import { EngagementsService } from './engagements.service';

describe('EngagementsService', () => {
  let service: EngagementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EngagementsService],
    }).compile();

    service = module.get<EngagementsService>(EngagementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
