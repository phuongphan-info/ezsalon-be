import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCustomerUuidToSalons1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('salons');
    if (!table) return;

    // Check if column already exists
    const hasColumn = table.columns.find((col) => col.name === 'customer_uuid');
    if (!hasColumn) {
      // Add customer_uuid column
      await queryRunner.addColumn(
        'salons',
        new TableColumn({
          name: 'customer_uuid',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    // Check if foreign key already exists
    const hasForeignKey = table.foreignKeys.find((fk) => fk.name === 'FK_salons_customer_uuid');
    if (!hasForeignKey) {
      // Add foreign key with CASCADE
      await queryRunner.createForeignKey(
        'salons',
        new TableForeignKey({
          name: 'FK_salons_customer_uuid',
          columnNames: ['customer_uuid'],
          referencedColumnNames: ['uuid'],
          referencedTableName: 'customers',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('salons');
    if (!table) return;

    // Drop foreign key if it exists
    const foreignKey = table.foreignKeys.find((fk) => fk.name === 'FK_salons_customer_uuid');
    if (foreignKey) {
      await queryRunner.dropForeignKey('salons', foreignKey);
    }

    // Drop column if it exists
    const hasColumn = table.columns.find((col) => col.name === 'customer_uuid');
    if (hasColumn) {
      await queryRunner.dropColumn('salons', 'customer_uuid');
    }
  }
}
