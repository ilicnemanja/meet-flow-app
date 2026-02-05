import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from 'src/common/db/base-entity';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

@Entity('experts')
export class Expert extends BaseEntity {
  @ApiProperty({ description: 'Expert first name' })
  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @ApiPropertyOptional({ description: 'Expert middle name', nullable: true })
  @Column({ name: 'middle_name', type: 'varchar', length: 255, nullable: true })
  middleName: string | null;

  @ApiProperty({ description: 'Expert last name' })
  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @ApiProperty({ description: 'Expert full name (auto-generated)' })
  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 255,
  })
  fullName: string;

  @ApiProperty({ description: 'Expert email address' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @BeforeInsert()
  @BeforeUpdate()
  setFullName() {
    const parts = [this.firstName, this.middleName, this.lastName].filter(
      Boolean,
    );
    this.fullName = parts.join(' ');
  }
}
