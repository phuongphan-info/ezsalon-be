import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn } from "typeorm";

export class CreatePaymentsTable1761550447659 implements MigrationInterface {
  name = 'CreatePaymentsTable1761550447659'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('payments');

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'payments',
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
              name: 'subscription_uuid',
              type: 'char',
              length: '36',
              isNullable: true,
            },
            {
              name: 'stripe_invoice_uuid',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'stripe_payment_intent_uuid',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'amount_paid',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'currency',
              type: 'varchar',
              length: '10',
              default: "'usd'",
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['paid', 'unpaid', 'void', 'failed', 'pending'],
              default: "'pending'",
            },
            {
              name: 'paid_at',
              type: 'timestamp',
              isNullable: true,
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
    } else {
      // Ensure column definitions align with expected schema when table already exists
      await queryRunner.changeColumn(
        'payments',
        'customer_uuid',
        new TableColumn({
          name: 'customer_uuid',
          type: 'char',
          length: '36',
          isNullable: false,
        }),
      );

      await queryRunner.changeColumn(
        'payments',
        'subscription_uuid',
        new TableColumn({
          name: 'subscription_uuid',
          type: 'char',
          length: '36',
          isNullable: true,
        }),
      );
    }

    const table = await queryRunner.getTable('payments');
    const foreignKeys = table?.foreignKeys ?? [];

    if (!foreignKeys.some((fk) => fk.columnNames.includes('customer_uuid'))) {
      await queryRunner.createForeignKey(
        'payments',
        new TableForeignKey({
          columnNames: ['customer_uuid'],
          referencedTableName: 'customers',
          referencedColumnNames: ['uuid'],
          onDelete: 'CASCADE',
        }),
      );
    }

    if (!foreignKeys.some((fk) => fk.columnNames.includes('subscription_uuid'))) {
      await queryRunner.createForeignKey(
        'payments',
        new TableForeignKey({
          columnNames: ['subscription_uuid'],
          referencedTableName: 'subscriptions',
          referencedColumnNames: ['uuid'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('payments');

    const customerFk = table.foreignKeys.find((fk) => fk.columnNames.includes('customer_uuid'));
    const subFk = table.foreignKeys.find((fk) => fk.columnNames.includes('subscription_uuid'));

    if (customerFk) await queryRunner.dropForeignKey('payments', customerFk);
    if (subFk) await queryRunner.dropForeignKey('payments', subFk);

    await queryRunner.dropTable('payments');
  }
}
