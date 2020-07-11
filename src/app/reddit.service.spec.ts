import { TestBed } from '@angular/core/testing';

import { RedditService } from './reddit.service';

describe('RedditService', () => {
  let service: RedditService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RedditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
