import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from "@angular/common/http";
import { Reddit } from "./reddit.types";



@Injectable({
  providedIn: 'root'
})
export class RedditService {
  readonly REDDIT_URL = 'https://www.reddit.com';

  constructor(
    private http: HttpClient
  ) { }

  getHot(subreddit: string, after?: string, before?: string): Observable<Reddit> {
    let params: HttpParams = new HttpParams();
    if (after) {
      params = params.append('after', after);
    }
    if (before) {
      params = params.append('before', after);
    }
    return this.http.get<Reddit>(`${this.REDDIT_URL}/r/${subreddit}/hot.json`, { params: params });
  }
}
