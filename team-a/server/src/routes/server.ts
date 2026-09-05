import { createApp } from './app';
import { env } from './config/env';
import { connectAll, registerShutdownHooks } from './database/connection';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectAll();
  registerShutdownHooks();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`server listening on port ${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'failed to start server');
  process.exit(1);
});
