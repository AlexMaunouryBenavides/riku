import { Module } from '@nestjs/common';

// Module racine, vide à dessein. Les modules métier (auth, users, catalog,
// revision) viendront s'y déclarer — cf. specifications-techniques.md §4.
@Module({})
export class AppModule {}
