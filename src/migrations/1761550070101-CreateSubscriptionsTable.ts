import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateSubscriptionsTable1761550070101 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('subscriptions');

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'subscriptions',
          columns: [
            {
              name: 'uuid',
              type: 'varchar',
              length: '36',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: '(UUID())',
            },
            {
              name: 'stripe_subscription_uuid',
              type: 'varchar',
              length: '255',
              isUnique: true,
            },
            {
              name: 'plan_uuid',
              type: 'varchar',
              length: '36',
            },
            {
              name: 'customer_uuid',
              type: 'varchar',
              length: '36',
            },
            {
              name: 'current_period_start_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'current_period_end_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'trial_start_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'trial_end_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'cancel_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'cancel_at_period_end',
              type: 'tinyint',
              width: 1,
              default: 0,
            },
            {
              name: 'canceled_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'paid_at',
              type: 'datetime',
              isNullable: true,
            },
            {
              name: 'latest_invoice_id',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'],
              default: "'incomplete'",
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
    }

    const stripeUuidIndexName = 'IDX_subscriptions_stripe_subscription_uuid';
    const customerUuidIndexName = 'IDX_subscriptions_customer_uuid';
    const planUuidIndexName = 'IDX_subscriptions_plan_uuid';
    const statusIndexName = 'IDX_subscriptions_status';

    let table = await queryRunner.getTable('subscriptions');
    const existingIndices = table?.indices ?? [];

    if (!existingIndices.some((idx) => idx.name === stripeUuidIndexName)) {
      await queryRunner.createIndex('subscriptions', new TableIndex({
        name: stripeUuidIndexName,
        columnNames: ['stripe_subscription_uuid'],
        isUnique: true,
      }));
    }

    if (!existingIndices.some((idx) => idx.name === customerUuidIndexName)) {
      await queryRunner.createIndex('subscriptions', new TableIndex({
        name: customerUuidIndexName,
        columnNames: ['customer_uuid'],
      }));
    }

    if (!existingIndices.some((idx) => idx.name === planUuidIndexName)) {
      await queryRunner.createIndex('subscriptions', new TableIndex({
        name: planUuidIndexName,
        columnNames: ['plan_uuid'],
      }));
    }

    if (!existingIndices.some((idx) => idx.name === statusIndexName)) {
      await queryRunner.createIndex('subscriptions', new TableIndex({
        name: statusIndexName,
        columnNames: ['status'],
      }));
    }

  table = await queryRunner.getTable('subscriptions');

    if (table && !table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_customer_uuid')) {
      await queryRunner.createForeignKey('subscriptions', new TableForeignKey({
        columnNames: ['customer_uuid'],
        referencedColumnNames: ['uuid'],
        referencedTableName: 'customers',
        onDelete: 'RESTRICT',
        name: 'FK_subscriptions_customer_uuid',
      }));
    }

    if (table && !table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_plan_uuid')) {
      await queryRunner.createForeignKey('subscriptions', new TableForeignKey({
        columnNames: ['plan_uuid'],
        referencedColumnNames: ['uuid'],
        referencedTableName: 'plans',
        onDelete: 'RESTRICT',
        name: 'FK_subscriptions_plan_uuid',
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('subscriptions');
    if (!tableExists) {
      return;
    }

    const table = await queryRunner.getTable('subscriptions');
    if (table) {
      if (table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_plan_uuid')) {
        await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_plan_uuid');
      }
      if (table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_customer_uuid')) {
        await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_customer_uuid');
      }
    }

    const refreshedTable = await queryRunner.getTable('subscriptions');
    const indices = refreshedTable?.indices ?? [];

    if (indices.some((idx) => idx.name === 'IDX_subscriptions_status')) {
      await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_status');
    }
    if (indices.some((idx) => idx.name === 'IDX_subscriptions_plan_uuid')) {
      await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_plan_uuid');
    }
    if (indices.some((idx) => idx.name === 'IDX_subscriptions_customer_uuid')) {
      await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_customer_uuid');
    }
    if (indices.some((idx) => idx.name === 'IDX_subscriptions_stripe_subscription_uuid')) {
      await queryRunner.dropIndex('subscriptions', 'IDX_subscriptions_stripe_subscription_uuid');
    }

    await queryRunner.dropTable('subscriptions');
  }
}
