import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Reddit, RedditPopularSubreddits, RedditTrendingSubreddits, RedditAboutSubreddit } from './reddit.types';

@Injectable({
  providedIn: 'root'
})
export class RedditService {
  readonly REDDIT_URL = 'https://www.reddit.com';

  constructor(
    private http: HttpClient
  ) { }

  getRedditListing(subreddit: string, listing: string, after?: string, before?: string): Observable<Reddit> {
    let params: HttpParams = new HttpParams();
    if (after) {
      params = params.append('after', after);
    }
    if (before) {
      params = params.append('before', after);
    }
    return this.http.get<Reddit>(`${this.REDDIT_URL}/r/${subreddit}/${listing}.json`, { params });
  }

  getTrendingSubreddits(): Observable<RedditTrendingSubreddits> {
    return this.http.get<RedditTrendingSubreddits>(`${this.REDDIT_URL}/api/trending_subreddits.json`);
  }

  getPopularSubreddits(): Observable<RedditPopularSubreddits> {
    return this.http.get<RedditPopularSubreddits>(`${this.REDDIT_URL}/subreddits/popular.json`);
  }

  getSubredditInfo(subreddit: string): Observable<RedditAboutSubreddit> {
    return this.http.get<RedditAboutSubreddit>(`${this.REDDIT_URL}/r/${subreddit}/about.json`);
  }
}
