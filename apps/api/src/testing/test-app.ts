import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { API_PREFIX } from '@/common/api-prefix';

/**
 * The application, booted for a test.
 *
 * The tests run against the **real** application — the real controllers,
 * the real guards, the real services, the real database — and the only
 * thing that is not real is the database: it is a database of its own, with
 * its own name, that the test setup creates and the test teardown drops.
 *
 * The application is served over HTTP on a random port, so the tests make
 * real requests: a header that is not sent is not sent, and a route that
 * does not exist is a 404.
 */
export interface TestApp {
  app: INestApplication;
  /** The base URL the application is served on. */
  url: string;
  /** Stop the application and release its resources. */
  close: () => Promise<void>;
}

/**
 * Boot the application.
 *
 * The environment is the tests' own — the setup file has already set the
 * test database and the test secrets.
 */
export async function startTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX, { exclude: ['metrics'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  await app.init();
  await app.listen(0);

  const url = await app.getUrl();
  return {
    app,
    url,
    close: async () => {
      await app.close();
    },
  };
}


