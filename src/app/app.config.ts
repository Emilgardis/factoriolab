import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  ErrorHandler,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { loadModule } from 'glpk-ts';
import { PrimeNGConfig } from 'primeng/api';

import { environment } from 'src/environments';
import { routes } from './app.routes';
import {
  DEFAULT_LANGUAGE,
  LabErrorHandler,
  ThemeService,
  TranslateService,
} from './services';
import { metaReducers, reducers } from './store';
import { AnalyticsEffects } from './store/analytics.effects';
import { DatasetsEffects } from './store/datasets/datasets.effects';
import { ObjectivesEffects } from './store/objectives/objectives.effects';
import { SettingsEffects } from './store/settings/settings.effects';

function initializeApp(primengConfig: PrimeNGConfig): () => Promise<unknown> {
  return () => {
    // Enable ripple
    primengConfig.ripple = true;

    // Set up initial theme
    ThemeService.appInitTheme();

    // Load glpk-wasm
    return loadModule('assets/glpk-wasm/glpk.all.wasm');
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_BASE_HREF, useValue: environment.baseHref },
    { provide: DEFAULT_LANGUAGE, useValue: 'en' },
    { provide: ErrorHandler, useClass: LabErrorHandler },
    {
      provide: APP_INITIALIZER,
      deps: [
        PrimeNGConfig,
        /**
         * Not actually used by `initializeApp`; included to ensure service
         * constructor is run so language data is requested immediately.
         */
        TranslateService,
      ],
      useFactory: initializeApp,
      multi: true,
    },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(PreloadAllModules),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideStore(reducers, {
      metaReducers,
    }),
    provideStoreDevtools({ logOnly: environment.production }),
    provideEffects(
      DatasetsEffects,
      ObjectivesEffects,
      SettingsEffects,
      AnalyticsEffects,
    ),
  ],
};
