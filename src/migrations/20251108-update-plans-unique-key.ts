import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePlansUniqueKey1731063324000 implements MigrationInterface {
    name = 'UpdatePlansUniqueKey1731063324000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the old unique key if it exists
        await queryRunner.query(`ALTER TABLE \`plans\` DROP INDEX \`IDX_plans_name_interval_count\``).catch(() => {
            // Index might not exist, ignore error
        });
        
        // Add the new unique key on stripe_plan_id and stripe_price_id
        await queryRunner.query(`ALTER TABLE \`plans\` ADD UNIQUE INDEX \`IDX_plans_name_interval_count\` (\`stripe_plan_id\`, \`stripe_price_id\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the new unique key
        await queryRunner.query(`ALTER TABLE \`plans\` DROP INDEX \`IDX_plans_name_interval_count\``);
    }
}
