import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanUniqueIndex1763767800000 implements MigrationInterface {
    name = 'AddPlanUniqueIndex1763767800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("UPDATE `plans` SET `billing_interval` = 'month' WHERE `billing_interval` IS NULL");
        await queryRunner.query("UPDATE `plans` SET `billing_interval_count` = 1 WHERE `billing_interval_count` IS NULL");
        await queryRunner.query("ALTER TABLE `plans` MODIFY `billing_interval` enum('day','week','month','year') NOT NULL DEFAULT 'month'");
        await queryRunner.query("ALTER TABLE `plans` MODIFY `billing_interval_count` int NOT NULL DEFAULT 1");
        await queryRunner.query("ALTER TABLE `plans` ADD UNIQUE INDEX `IDX_plans_name_interval_count` (`plan_name`, `billing_interval`, `billing_interval_count`)");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `plans` DROP INDEX `IDX_plans_name_interval_count`");
        await queryRunner.query("ALTER TABLE `plans` MODIFY `billing_interval_count` int NULL DEFAULT 1");
        await queryRunner.query("ALTER TABLE `plans` MODIFY `billing_interval` enum('day','week','month','year') NULL DEFAULT 'month'");
    }

}
