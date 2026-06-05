declare const module: any

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(false);
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .addBearerAuth()
    .build();
  const documentFactoryApp = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactoryApp);
  await app.listen(process.env.PORT ?? 3000);

  // const documentFactoryUser = () => SwaggerModule.createDocument(user, config);
  // SwaggerModule.setup('api', user, documentFactoryUser);
  // await user.listen(process.env.PORT ?? 3001);

  // const documentFactoryAuth = () => SwaggerModule.createDocument(auth, config);
  // SwaggerModule.setup('api', auth, documentFactoryAuth);
  // await auth.listen(process.env.PORT ?? 3002);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
