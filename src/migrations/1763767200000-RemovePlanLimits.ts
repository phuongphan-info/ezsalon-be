import { MigrationInterface, QueryRunner } from "typeorm";

export class RemovePlanLimits1763767200000 implements MigrationInterface {
    name = 'RemovePlanLimits1763767200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `plans` DROP COLUMN `max_staff_per_salon`");
        await queryRunner.query("ALTER TABLE `plans` DROP COLUMN `max_salons`");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query("ALTER TABLE `plans` ADD `max_salons` int NULL");
        await queryRunner.query("ALTER TABLE `plans` ADD `max_staff_per_salon` int NULL");
    }

}
