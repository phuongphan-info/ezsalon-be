import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateStripesTable1761550070203 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.createTable(
      new Table({
        name: 'stripes',
        columns: [
          {
            name: 'uuid',
            type: 'char',
            length: '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: '(UUID())',
          },
          {
            name: 'customer_uuid',
            type: 'char',
            length: '36',
            isNullable: false,
          },
          {
            name: 'stripe_customer_uuid',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('stripes', new TableIndex({
      name: 'IDX_stripes_stripe_customer_uuid',
      columnNames: ['stripe_customer_uuid'],
      isUnique: true,
    }));

    await queryRunner.createIndex('stripes', new TableIndex({
      name: 'IDX_stripes_customer_uuid',
      columnNames: ['customer_uuid'],
    }));

    await queryRunner.createForeignKey(
      'stripes',
      new TableForeignKey({
        columnNames: ['customer_uuid'],
        referencedTableName: 'customers',
        referencedColumnNames: ['uuid'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('stripes');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.includes('customer_uuid'));
    if (foreignKey) {
      await queryRunner.dropForeignKey('stripes', foreignKey);
    }

    await queryRunner.dropIndex('stripes', 'IDX_stripes_customer_uuid');
    await queryRunner.dropIndex('stripes', 'IDX_stripes_stripe_customer_uuid');

    await queryRunner.dropTable('stripes');
  }
}
