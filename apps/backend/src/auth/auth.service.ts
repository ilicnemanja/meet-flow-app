import { Injectable } from '@nestjs/common';
import { MicrosoftAuthService } from '@microsoft/graph';

@Injectable()
export class AuthService {
  constructor(private readonly microsoftAuthService: MicrosoftAuthService) {}

  login() {
    this.microsoftAuthService.authorize();
  }
}
