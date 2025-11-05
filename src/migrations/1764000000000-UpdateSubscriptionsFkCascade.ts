import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class UpdateSubscriptionsFkCascade1764000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('subscriptions');
    if (!table) return;

    // Drop existing foreign keys if present
    const fkCustomer = table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_customer_uuid');
    if (fkCustomer) {
      await queryRunner.dropForeignKey('subscriptions', fkCustomer);
    }

    const fkPlan = table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_plan_uuid');
    if (fkPlan) {
      await queryRunner.dropForeignKey('subscriptions', fkPlan);
    }

    // Recreate with CASCADE on delete and update
    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_customer_uuid',
        columnNames: ['customer_uuid'],
        referencedColumnNames: ['uuid'],
        referencedTableName: 'customers',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_plan_uuid',
        columnNames: ['plan_uuid'],
        referencedColumnNames: ['uuid'],
        referencedTableName: 'plans',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('subscriptions');
    if (!table) return;

    // Drop the cascade foreign keys if present
    const fkCustomer = table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_customer_uuid');
    if (fkCustomer) {
      await queryRunner.dropForeignKey('subscriptions', fkCustomer);
    }

    const fkPlan = table.foreignKeys.find((fk) => fk.name === 'FK_subscriptions_plan_uuid');
    if (fkPlan) {
      await queryRunner.dropForeignKey('subscriptions', fkPlan);
    }

    // Recreate original restrictive foreign keys
    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_customer_uuid',
        columnNames: ['customer_uuid'],
        referencedColumnNames: ['uuid'],
        referencedTableName: 'customers',
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'FK_subscriptions_plan_uuid',
        columnNames: ['plan_uuid'],
        referencedColumnNames: ['uuid'],
        referencedTableName: 'plans',
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT',
      }),
    );
  }
}
