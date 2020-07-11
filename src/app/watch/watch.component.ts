import { Component, OnInit, ViewChild } from '@angular/core';
import { RedditService } from "../reddit.service";
import { ChildData } from '../reddit.types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { YouTubePlayer } from '@angular/youtube-player';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, filter, repeat, expand, takeUntil, takeWhile, take, startWith, tap, throttleTime } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material/select';

export interface RedditVideo extends ChildData {
  youtubeId: string;
}

@Component({
  selector: 'app-watch',
  templateUrl: './watch.component.html',
  styleUrls: ['./watch.component.scss']
})
export class WatchComponent implements OnInit {
  currentVideo: RedditVideo;
  currentSubreddit: string = 'videos';
  customSubreddit: boolean = false;
  subreddits: string[] = ['videos', 'music', 'listen', 'volkswagen', 'audi', 'funny']
  videos: RedditVideo[] = [];
  @ViewChild(YouTubePlayer) youtubePlayer: YouTubePlayer;

  constructor(
    private redditService: RedditService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initYouTube();
    this.changeSubreddit('videos').subscribe();
  }

  getVideos(subreddit: string, after?: string): Observable<RedditVideo[]> {
    console.log('getVideos', subreddit, after);
    const video = [];
    return this.redditService.getHot(subreddit, after).pipe(
      map((hotVids) => {
        const videos: RedditVideo[] = [];
        hotVids.data.children.forEach((child) => {
          if (child.data.is_video || child.data.media) {
            const youtubeId = youtube_parser(child.data.url);
            if (youtubeId) {
              const video: RedditVideo = { youtubeId, ...child.data };
              videos.push(video);
            }
          }
        });
        return videos;
      })
    );
  }

  loadMore() {
    const lastVideo = this.videos[this.videos.length - 1];
    console.log('loading more after', lastVideo.name, lastVideo);
    if (lastVideo) {
      this.getVideos(this.currentSubreddit, lastVideo.name).subscribe((videos) => this.videos = this.videos.concat(videos))
    }
  }

  selectVideo(id: string): void {
    const foundVideo = this.videos.find((vid) => vid.youtubeId === id);
    if (foundVideo) {
      this.currentVideo = foundVideo;
      this.youtubePlayer.videoId = this.currentVideo.youtubeId;
      this.snackBar.open(`Playing - ${this.currentVideo.title}`, null, {
        duration: 3000
      });
      console.log(this.youtubePlayer);
      this.youtubePlayer.playVideo();
    } else {
      this.snackBar.open(`Failed to selected video ${id}`);
    }
  }

  changeSubreddit(subreddit: string): Observable<RedditVideo[]> {
    let attempts = 0;
    const lastVideo = this.videos[this.videos.length - 1]?.name;
    return this.getVideos(subreddit).pipe(
      expand((v) => this.getVideos(subreddit, lastVideo)),
      tap(() => attempts++),
      takeWhile(() => this.videos.length < 30 && attempts < 10)
    ).pipe(
      tap((videos) => {
        this.videos = this.videos.concat(videos)
        this.currentVideo = this.videos[0];
        this.youtubePlayer.playVideo();
      })
    )
  }

  setCustomSubreddit(e) {
    this.customSubreddit = true;
    e.preventDefault();
  }

  onSubredditChange(event: MatSelectChange) {
    this.videos = [];
    this.changeSubreddit(this.currentSubreddit = event.value).subscribe();
  }

  onPlayerReady(event: YT.PlayerEvent) {
    event.target.playVideo();
  }

  onPlayerStateChange(event: YT.OnStateChangeEvent) {
    switch (event.data) {
      case YT.PlayerState.ENDED:
        this.playNextVideo();
        break;
      default:
        // console.log('default', event);
        break;
    }
  }

  playNextVideo() {
    const foundIndex = this.videos.findIndex((v) => this.currentVideo.youtubeId === v.youtubeId);
    const nextVideo = this.videos[foundIndex + 1];
    if (nextVideo) {
      this.currentVideo = nextVideo;
      setTimeout(() => {
        this.youtubePlayer.playVideo();
      }, 500)
    }
  }

  private initYouTube() {
    // This code loads the IFrame Player API code asynchronously, according to the instructions at
    // https://developers.google.com/youtube/iframe_api_reference#Getting_Started
    const tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }
}

function youtube_parser(url) {
  var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return (match && match[7].length == 11) ? match[7] : false;
}
