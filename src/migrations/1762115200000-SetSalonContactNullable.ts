import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetSalonContactNullable1762115200000 implements MigrationInterface {
  private readonly tableName = 'salons';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(this.tableName);
    if (!hasTable) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`${this.tableName}\`
        MODIFY \`salon_address\` varchar(255) NULL,
        MODIFY \`phone_number\` varchar(255) NULL,
        MODIFY \`email_address\` varchar(255) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(this.tableName);
    if (!hasTable) {
      return;
    }

    await queryRunner.query(
      `ALTER TABLE \`${this.tableName}\`
        MODIFY \`salon_address\` varchar(255) NOT NULL,
        MODIFY \`phone_number\` varchar(255) NOT NULL,
        MODIFY \`email_address\` varchar(255) NOT NULL`
    );
  }
}
