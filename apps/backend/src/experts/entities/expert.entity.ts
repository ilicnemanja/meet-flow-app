import { BaseEntity } from 'src/common/db/base-entity';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

@Entity('experts')
export class Expert extends BaseEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 255, nullable: true })
  middleName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 255,
  })
  fullName: string;

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
