import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from '~/app.component';
import { appConfig } from '~/app.config';
import { APP } from '~/models/constants';

import { environment } from './environments/environment';

console.info(`${APP} ${environment.version}`);

bootstrapApplication(AppComponent, appConfig).catch((err: unknown) => {
  console.error(err);
});
