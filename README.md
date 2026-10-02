# plaza-payments

Los pagos de [Plaza](https://github.com/ahincho/nova-plaza-01-shared-platform), en NestJS. Son simulados: no
hablan con ninguna pasarela. Autorizan el pago de un pedido, lo devuelven y lo reembolsan, que es la compensación del
BFF cuando la compra falla después de cobrar.

Las decisiones están en [ADR-043](https://github.com/ahincho/nova-shared-01-docs/blob/main/adrs/shared/ADR-043-plaza-la-plataforma-de-compras.md)
y [ADR-056](https://github.com/ahincho/nova-shared-01-docs/blob/main/adrs/shared/ADR-056-plaza-fase-1-catalogo-y-pagos-en-nestjs.md).
Es el primer servicio NestJS de Nova dueño de datos, el caso que
[ADR-020](https://github.com/ahincho/nova-shared-01-docs/blob/main/adrs/nest/ADR-020-orm-persistencia.md) esperaba.

## API

| Método | Ruta                       | Qué hace                                                       | Errores                                             |
| ------ | -------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `POST` | `/v1/payments`             | autoriza el pago de un pedido: `orderId`, `amount`, `currency` | 422 `PAYMENT_DECLINED`, 409 `PAYMENT_CONFLICT`, 400 |
| `GET`  | `/v1/payments/{id}`        | un pago                                                        | 404 `PAYMENT_NOT_FOUND`                             |
| `POST` | `/v1/payments/{id}/refund` | reembolsa el pago                                              | 404 `PAYMENT_NOT_FOUND`                             |

Cada respuesta llega en el sobre de Nova, y cada error con su código y su capa, igual que en pedidos (Spring Boot) y
en el catálogo (Quarkus). El cobro lleva el cliente en `X-Customer-Id`, que pone el BFF.

- **Rechaza de forma predecible:** un monto sobre el tope, 1000 por defecto, es un 422. Así la demo muestra la
  compensación a pedido.
- **Un pedido tiene un solo pago.** El primer cobro responde 201; repetirlo con el mismo monto responde 200 con el
  mismo pago, y con otro monto, 409. Lo garantiza la restricción única de la base: tres cobros simultáneos del mismo
  pedido dejan un pago.
- **Reembolsar es idempotente:** un pago reembolsado responde igual.
- **Los montos viajan como número** y se guardan en centavos enteros, nunca como un número con decimales.

## La arquitectura

La forma hexagonal del estilo `acl` del generador de Nova, con un contexto acotado, `payments`:

| Carpeta                            | Qué hay                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `payments/domain`                  | `Payment` y `Money`, sin framework                         |
| `payments/exception`               | los errores del dominio, `PaymentErrors`                   |
| `payments/port/in`                 | los tres casos de uso: autorizar, devolver y reembolsar    |
| `payments/port/out`                | `PaymentStorePort`, lo que el núcleo necesita de la base   |
| `payments/service`                 | un servicio por caso de uso                                |
| `payments/adapter/in/web`          | el controlador, con `request/` y `response/`               |
| `payments/adapter/out/persistence` | la entidad de TypeORM y el puerto de salida sobre Postgres |

`nova lint:arch` comprueba las reglas en cada `verify`: las mismas nueve, con los mismos nombres, que el catálogo en
Quarkus.

**La base, con TypeORM**, como dependencia del servicio y no de la plataforma (ADR-020). Las migraciones están en
`src/migrations` y corren al arrancar, como Flyway en Java; `synchronize` está apagado. La sonda `/health/ready` hace un
`select 1`, así que el balanceador no le manda tráfico si la base no responde.

## Correrlo en local

Levantar Postgres y Vault desde [`nova-plaza-01-shared-platform`](https://github.com/ahincho/nova-plaza-01-shared-platform)
con `docker compose up -d --wait`, y después:

```bash
export NOVA_SECRETS_IMPORT=vault:plaza/payments/db VAULT_ADDR=http://localhost:8200 VAULT_TOKEN=plaza-local-root
pnpm install && pnpm start:dev
```

Escucha en el puerto 8083, con la documentación en `/docs`. `pnpm install` necesita un token con `read:packages` para
el scope `@ahincho`, una vez por máquina:

```bash
pnpm config set "//npm.pkg.github.com/:_authToken" <token con read:packages>
```

## Pruebas

```bash
pnpm verify
```

Corre los tipos, el lint, las reglas de arquitectura, las pruebas con su cobertura y el formato.

| Prueba                        | Qué cubre                                                                              | Necesita                   |
| ----------------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| `money.spec.ts`               | los montos en centavos                                                                 | nada                       |
| `payments.service.spec.ts`    | los casos de uso con el puerto en memoria, incluida la carrera de dos cobros           | nada                       |
| `payments.controller.spec.ts` | la traducción del controlador y el 201 frente al 200                                   | nada                       |
| `test/app.e2e-spec.ts`        | todo el servicio contra Postgres, con las migraciones, la restricción única y el sobre | Docker, por Testcontainers |

El CI, además, construye la imagen y la levanta junto a un Postgres hasta que `/health/ready` responde.

## Licencia

[Eclipse Public License 2.0](LICENSE).
