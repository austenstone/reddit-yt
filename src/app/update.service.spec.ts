/* eslint-disable @typescript-eslint/no-unused-vars */

import { TestBed, async, inject } from '@angular/core/testing';
import { UpdateService } from './update.service';

describe('Service: Update', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UpdateService]
    });
  });

  it('should ...', inject([UpdateService], (service: UpdateService) => {
    expect(service).toBeTruthy();
  }));
});
