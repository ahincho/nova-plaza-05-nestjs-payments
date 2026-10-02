import { appEnvironment, bootstrap } from '@ahincho/nova-nestjs';
import { AppModule } from './app.module';

/**
 * El puerto de pagos en Plaza cuando nadie inyecta `PORT` (ADR-056). El 3000
 * por defecto de la plataforma queda para Grafana en la máquina de desarrollo.
 */
const PLAZA_PORT = 8083;

// El main.ts completo. El ValidationPipe con la fábrica del sobre, el bind a
// 0.0.0.0, el logger estructurado, los hooks de apagado, el 503 mientras se
// cierra y la exclusión de las sondas del prefijo global los pone bootstrap();
// nada de eso se copia por servicio.
//
// **Una sola imagen para los tres ambientes.** Nada se decide al construir:
// todo llega por variable de entorno, que es lo que inyecta la task definition.
void bootstrap(AppModule, {
  // `/v1/payments`, como `/v1/orders` en pedidos y `/v1/products` en el
  // catálogo: los tres servicios de Plaza responden igual.
  globalPrefix: 'v1',
  ...(process.env['PORT'] === undefined ? { port: PLAZA_PORT } : {}),
  cors: { origins: process.env['CORS_ALLOWED_ORIGINS'] ?? '' },

  // Las credenciales de la base salen de Vault (ADR-049): con
  // NOVA_SECRETS_IMPORT=vault:plaza/payments/db, el secreto trae DB_URL,
  // DB_USERNAME y DB_PASSWORD, y quedan como variables de entorno antes de que
  // exista la aplicación. La dirección y el token de Vault llegan por VAULT_ADDR
  // y VAULT_TOKEN.
  //
  // El almacén se pide desde el entorno y no en el código, como lo pediría una
  // task definition: así la misma imagen arranca en CI con las credenciales de
  // una base de prueba, sin un Vault.
  secrets: true,

  openapi: {
    title: 'PlazaPayments',
    description: 'Los pagos simulados de Plaza',

    // `appEnvironment()` lee NODE_ENV. Sin inyectar nada cae en `production`,
    // el más restrictivo: un contenedor que nadie configuró no publica la
    // documentación.
    enabled: appEnvironment() !== 'production',

    // En false porque pagos confía en el BFF, que es quien valida el token
    // (ADR-043).
    bearerAuth: false,
  },
});
