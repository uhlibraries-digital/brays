/// <reference path="../typings/electron.d.ts" />
/// <reference path="../typings/csv-parse.d.ts" />
/// <reference path="../typings/csv-stringify" />
/// <reference path="../typings/mime.d.ts" />
/// <reference path="../typings/object-hash.d.ts" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app.module';

const platform = platformBrowserDynamic();
platform.bootstrapModule(AppModule);
