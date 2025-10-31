import * as dotenv from 'dotenv';

dotenv.config();

export const shouldUseTestDatabase = (): boolean => {
  return process.env.JEST_WORKER_ID !== undefined;
};

export type DatabaseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  useTest: boolean;
};

export const resolveDatabaseConfig = (): DatabaseConfig => {
  const useTest = shouldUseTestDatabase();

  const host = useTest
    ? process.env.DATABASE_TEST_HOST
    : process.env.DATABASE_HOST;

  const port = parseInt(
    useTest
      ? process.env.DATABASE_TEST_PORT
      : process.env.DATABASE_PORT,
    10,
  );

  const username = useTest
    ? process.env.DATABASE_TEST_USERNAME
    : process.env.DATABASE_USERNAME;

  const password = useTest
    ? process.env.DATABASE_TEST_PASSWORD
    : process.env.DATABASE_PASSWORD;

  const database = useTest
    ? process.env.DATABASE_TEST_NAME
    : process.env.DATABASE_NAME;

  return {
    host,
    port,
    username,
    password,
    database,
    useTest,
  };
};
