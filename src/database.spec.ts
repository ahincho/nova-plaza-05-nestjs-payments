import { databaseCheck, databaseOptions } from './database';

describe('la conexión a la base', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  function credentials(url: string): void {
    process.env['DB_URL'] = url;
    process.env['DB_USERNAME'] = 'payments';
    process.env['DB_PASSWORD'] = 'secreto';
  }

  it('desarma la URL y deja las credenciales aparte', () => {
    credentials('postgres://localhost:5435/payments');

    expect(databaseOptions()).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5435,
      database: 'payments',
      username: 'payments',
      password: 'secreto',
      migrationsRun: true,
      synchronize: false,
    });
  });

  it('sin puerto en la URL usa el de Postgres', () => {
    credentials('postgres://db.internal/payments');

    expect(databaseOptions()).toMatchObject({
      host: 'db.internal',
      port: 5432,
    });
  });

  it.each(['DB_URL', 'DB_USERNAME', 'DB_PASSWORD'])(
    'sin %s no arranca, y el error nombra la variable',
    (name) => {
      credentials('postgres://localhost:5435/payments');
      process.env[name] = ' ';

      expect(() => databaseOptions()).toThrow(name);
    },
  );

  it('sin conexión, la sonda dice que no está listo', async () => {
    await expect(databaseCheck.check()).resolves.toBe(false);
  });
});
