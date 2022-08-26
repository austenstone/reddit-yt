import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RedditService } from './reddit.service';

describe('RedditService', () => {
  let service: RedditService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule
      ],
      providers: [RedditService]
    });
    service = TestBed.inject(RedditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
