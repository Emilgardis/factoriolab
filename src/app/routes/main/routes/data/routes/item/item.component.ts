import { KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

import { CollectionTableComponent } from '~/components/collection-table/collection-table.component';
import { coalesce, updateSetIds } from '~/helpers';
import { Category } from '~/models/data/category';
import { Item } from '~/models/data/item';
import { Game } from '~/models/enum/game';
import { ItemId } from '~/models/enum/item-id';
import { ItemSettings } from '~/models/settings/item-settings';
import { MachineSettings } from '~/models/settings/machine-settings';
import { BonusPercentPipe } from '~/pipes/bonus-percent.pipe';
import { IconClassPipe, IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { RoundPipe } from '~/pipes/round.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { UsagePipe } from '~/pipes/usage.pipe';
import { ItemsService } from '~/services/items.service';
import { MachinesService } from '~/services/machines.service';

import { DetailComponent } from '../../models/detail.component';

@Component({
  selector: 'lab-item',
  standalone: true,
  imports: [
    FormsModule,
    KeyValuePipe,
    BreadcrumbModule,
    ButtonModule,
    CheckboxModule,
    BonusPercentPipe,
    CollectionTableComponent,
    IconClassPipe,
    IconSmClassPipe,
    RoundPipe,
    TranslatePipe,
    UsagePipe,
  ],
  templateUrl: './item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemComponent extends DetailComponent {
  itemsSvc = inject(ItemsService);
  machinesSvc = inject(MachinesService);

  itemsStateRaw = this.itemsSvc.state;
  itemsState = this.itemsSvc.itemsState;
  machinesStateRaw = this.machinesSvc.state;
  machinesState = this.machinesSvc.machinesState;
  settings = this.settingsSvc.settings;

  obj = computed<Item | undefined>(() => this.data().itemEntities[this.id()]);
  breadcrumb = computed<MenuItem[]>(() => [
    this.parent() ?? {},
    { label: this.obj()?.name },
  ]);
  category = computed<Category | undefined>(() => {
    const id = this.id();
    const data = this.data();
    return data.categoryEntities[coalesce(data.itemEntities[id]?.category, '')];
  });
  recipes = computed(() => {
    const id = this.id();
    const data = this.data();
    const producedBy: string[] = [];
    const consumedBy: string[] = [];
    const producible: string[] = [];
    const unlocked: string[] = [];
    for (const r of data.recipeIds) {
      const recipe = data.recipeEntities[r];
      if (recipe.out[id]) producedBy.push(r);
      if (recipe.in[id]) consumedBy.push(r);
      if (recipe.producers.includes(id)) producible.push(r);
      if (recipe.unlockedBy === id) unlocked.push(r);
    }
    return { producedBy, consumedBy, producible, unlocked };
  });
  itemSettings = computed<ItemSettings | undefined>(
    () => this.itemsState()[this.id()],
  );
  machineSettings = computed<MachineSettings | undefined>(
    () => this.machinesState()[this.id()],
  );
  Game = Game;
  ItemId = ItemId;

  changeExcluded(value: boolean): void {
    const excludedItemIds = updateSetIds(
      this.id(),
      value,
      this.settings().excludedItemIds,
    );
    this.settingsSvc.apply({ excludedItemIds });
  }

  changeChecked(value: boolean): void {
    const checkedItemIds = updateSetIds(
      this.id(),
      value,
      this.settings().checkedItemIds,
    );
    this.settingsSvc.apply({ checkedItemIds });
  }
}
