import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { Column, Entity } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({ description: 'User first name' })
  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @ApiProperty({ description: 'User email address' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;
}
