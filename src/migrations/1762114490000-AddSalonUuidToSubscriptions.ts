import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from 'typeorm';

const TABLE_NAME = 'subscriptions';
const COLUMN_NAME = 'salon_uuid';
const INDEX_NAME = 'IDX_subscriptions_salon_uuid';
const FK_NAME = 'FK_subscriptions_salon_uuid';

export class AddSalonUuidToSubscriptions1762114490000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(TABLE_NAME);
    if (!hasTable) {
      return;
    }

    const hasColumn = await queryRunner.hasColumn(TABLE_NAME, COLUMN_NAME);
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${COLUMN_NAME}\` varchar(36) NULL AFTER \`uuid\``,
      );
    }

    const table = await queryRunner.getTable(TABLE_NAME);

    if (table && !table.indices.find((index) => index.name === INDEX_NAME)) {
      await queryRunner.createIndex(
        TABLE_NAME,
        new TableIndex({
          name: INDEX_NAME,
          columnNames: [COLUMN_NAME],
          isUnique: true,
        }),
      );
    }

    if (table && !table.foreignKeys.find((fk) => fk.name === FK_NAME)) {
      await queryRunner.createForeignKey(
        TABLE_NAME,
        new TableForeignKey({
          name: FK_NAME,
          columnNames: [COLUMN_NAME],
          referencedTableName: 'salons',
          referencedColumnNames: ['uuid'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable(TABLE_NAME);
    if (!hasTable) {
      return;
    }

    const table = await queryRunner.getTable(TABLE_NAME);

    if (table?.foreignKeys.find((fk) => fk.name === FK_NAME)) {
      await queryRunner.dropForeignKey(TABLE_NAME, FK_NAME);
    }

    if (table?.indices.find((index) => index.name === INDEX_NAME)) {
      await queryRunner.dropIndex(TABLE_NAME, INDEX_NAME);
    }

    const hasColumn = await queryRunner.hasColumn(TABLE_NAME, COLUMN_NAME);
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`${TABLE_NAME}\` DROP COLUMN \`${COLUMN_NAME}\``,
      );
    }
  }
}
