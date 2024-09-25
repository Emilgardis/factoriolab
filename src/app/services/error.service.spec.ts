import { TestBed } from '@angular/core/testing';

import { ErrorService } from './error.service';

describe('ErrorService', () => {
  let service: ErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle an error', () => {
    spyOn(console, 'error');
    service.handleError('test');
    expect(console.error).toHaveBeenCalledWith('test');
    expect(service.message$.value).toEqual('test');
  });
});
