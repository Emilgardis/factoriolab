import { ItemId, Mocks } from 'src/tests';
import { rational } from '~/models';
import * as App from '../app.actions';
import * as Actions from './machines.actions';
import { initialState, machinesReducer } from './machines.reducer';

describe('Machines Reducer', () => {
  const id = 'id';
  const value = 'value';

  describe('LOAD', () => {
    it('should load machine settings', () => {
      const result = machinesReducer(
        undefined,
        App.load({
          partial: {
            machinesState: Mocks.MachinesStateInitial,
          },
        }),
      );
      expect(result).toEqual(Mocks.MachinesStateInitial);
    });

    it('should handle missing partial state', () => {
      const result = machinesReducer(undefined, App.load({ partial: {} }));
      expect(result).toEqual(initialState);
    });
  });

  describe('RESET', () => {
    it('should return the initial state', () => {
      const result = machinesReducer(undefined, App.reset());
      expect(result).toEqual(initialState);
    });
  });

  describe('SET_FUEL', () => {
    it('should set the fuel for a machine', () => {
      const result = machinesReducer(
        undefined,
        Actions.setFuel({ id, value, def: undefined }),
      );
      expect(result[id].fuelId).toEqual(value);
    });
  });

  describe('SET_MODULES', () => {
    it('should set the modules for a machine', () => {
      const value = [{ count: rational(2n), id: ItemId.Module }];
      const result = machinesReducer(
        undefined,
        Actions.setModules({
          id,
          value,
        }),
      );
      expect(result[id].modules).toEqual(value);
    });
  });

  describe('SET_BEACONS', () => {
    it('should set the beacons for a machine', () => {
      const value = [
        {
          count: rational.zero,
          id: ItemId.Beacon,
          modules: [{ count: rational(2n), id: ItemId.Module }],
        },
      ];
      const result = machinesReducer(
        undefined,
        Actions.setBeacons({
          id,
          value,
        }),
      );
      expect(result[id].beacons).toEqual(value);
    });
  });

  describe('SET_OVERCLOCK', () => {
    it('should set the overclock for a machine', () => {
      const result = machinesReducer(
        undefined,
        Actions.setOverclock({
          id,
          value: rational(200n),
          def: rational(100n),
        }),
      );
      expect(result[id].overclock).toEqual(rational(200n));
    });
  });

  describe('RESET_MACHINE', () => {
    it('should reset a machine', () => {
      const result = machinesReducer(
        Mocks.MachinesStateInitial,
        Actions.resetMachine({ id: ItemId.AssemblingMachine2 }),
      );
      expect(result[ItemId.AssemblingMachine2]).toBeUndefined();
    });
  });

  it('should return the default state', () => {
    expect(machinesReducer(undefined, { type: 'Test' } as any)).toEqual(
      initialState,
    );
  });
});
