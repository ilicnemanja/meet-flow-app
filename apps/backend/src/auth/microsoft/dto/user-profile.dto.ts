export class UserProfileDto {
  id: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  photoUrl?: string;
}
