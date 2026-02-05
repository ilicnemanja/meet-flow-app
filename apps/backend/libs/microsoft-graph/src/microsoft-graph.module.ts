import { Module } from '@nestjs/common';
import { MicrosoftAuthModule } from './auth/microsoft-auth.module';
import { MicrosoftGraphService } from './microsoft-graph.service';

@Module({
  imports: [MicrosoftAuthModule],
  providers: [MicrosoftGraphService],
  exports: [MicrosoftGraphService],
})
export class MicrosoftGraphModule {}
