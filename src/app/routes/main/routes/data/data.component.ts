import { KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { TranslatePipe } from '~/pipes/translate.pipe';
import {
  selectDataset,
  selectModMenuItem,
} from '~/store/settings/settings.selectors';

@Component({
  selector: 'lab-data',
  standalone: true,
  imports: [
    KeyValuePipe,
    BreadcrumbModule,
    ButtonModule,
    TableModule,
    TranslatePipe,
  ],
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataComponent {
  store = inject(Store);

  home = this.store.selectSignal(selectModMenuItem);
  data = this.store.selectSignal(selectDataset);

  collections: MenuItem[] = [
    {
      label: 'data.categories',
      routerLink: 'categories',
      id: 'categoryIds',
    },
    {
      label: 'data.items',
      routerLink: 'items',
      id: 'itemIds',
    },
    {
      label: 'data.beacons',
      routerLink: 'beacons',
      id: 'beaconIds',
    },
    {
      label: 'data.belts',
      routerLink: 'belts',
      id: 'beltIds',
    },
    {
      label: 'data.cargoWagons',
      routerLink: 'cargo-wagons',
      id: 'cargoWagonIds',
    },
    {
      label: 'data.fluidWagons',
      routerLink: 'fluid-wagons',
      id: 'fluidWagonIds',
    },
    {
      label: 'data.fuels',
      routerLink: 'fuels',
      id: 'fuelIds',
    },
    {
      label: 'data.machines',
      routerLink: 'machines',
      id: 'machineIds',
    },
    {
      label: 'data.modules',
      routerLink: 'modules',
      id: 'moduleIds',
    },
    {
      label: 'data.pipes',
      routerLink: 'pipes',
      id: 'pipeIds',
    },
    {
      label: 'data.technologies',
      routerLink: 'technologies',
      id: 'technologyIds',
    },
    {
      label: 'data.recipes',
      routerLink: 'recipes',
      id: 'recipeIds',
    },
  ];
}
