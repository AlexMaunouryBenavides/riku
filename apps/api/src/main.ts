import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Amorçage minimal. Le pipe de validation global, helmet, cookie-parser et le
// filtre d'exceptions viendront ici (cf. plan-de-travail).
// process.env est lu en direct faute de module de config : à remplacer par
// @nestjs/config dès la tâche correspondante (configuration.r5).
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
