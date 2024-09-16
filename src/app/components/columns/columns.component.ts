import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';

import { Entities } from '~/models/entities';
import {
  ColumnKey,
  ColumnSettings,
  columnsInfo,
  ColumnsState,
  initialColumnsState,
} from '~/models/settings/column-settings';
import { PrecisionExamplePipe } from '~/pipes/precision-example.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { setColumns } from '~/store/preferences/preferences.actions';
import { initialPreferencesState } from '~/store/preferences/preferences.reducer';
import { selectColumnOptions } from '~/store/settings/settings.selectors';

import { DialogComponent } from '../modal';

@Component({
  selector: 'lab-columns',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    TableModule,
    PrecisionExamplePipe,
    TranslatePipe,
  ],
  templateUrl: './columns.component.html',
  styleUrls: ['./columns.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnsComponent extends DialogComponent {
  store = inject(Store);

  columnOptions = this.store.selectSignal(selectColumnOptions);

  editValue: Entities<ColumnSettings> = initialColumnsState;
  columnsInf = columnsInfo;

  get modified(): boolean {
    return (Object.keys(this.editValue) as ColumnKey[]).some(
      (k) =>
        this.editValue[k].precision !==
          initialPreferencesState.columns[k].precision ||
        this.editValue[k].show !== initialPreferencesState.columns[k].show,
    );
  }

  initEdit(columns: ColumnsState): void {
    this.editValue = (Object.keys(columns) as ColumnKey[])
      .filter((c) => columnsInfo[c] != null) // Filter out any obsolete keys
      .reduce((e: Entities<ColumnSettings>, c) => {
        e[c] = { ...columns[c] };
        return e;
      }, {});
  }

  open(value: ColumnsState): void {
    this.initEdit(value);
    this.show();
  }

  changeFraction(value: boolean, column: ColumnKey): void {
    this.editValue[column].precision = value ? null : 1;
  }

  reset(): void {
    this.initEdit(initialPreferencesState.columns);
  }

  save(): void {
    const columns = this.editValue as ColumnsState;
    this.store.dispatch(setColumns({ columns }));
  }
}
