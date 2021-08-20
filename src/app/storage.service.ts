import { Injectable } from '@angular/core';
import { RedditVideoStorage } from './watch/watch.component';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  static readonly lastUsedNodeKey = 'videos';

  constructor() { }

  storeVideos(videos: RedditVideoStorage[]): void {
    try {
      window.localStorage[StorageService.lastUsedNodeKey] = JSON.stringify(videos);
    } catch { }
  }

  getVideos(): RedditVideoStorage[] {
    try {
      return JSON.parse(window.localStorage[StorageService.lastUsedNodeKey]) || [];
    } catch {
      return [];
    }
  }

}
