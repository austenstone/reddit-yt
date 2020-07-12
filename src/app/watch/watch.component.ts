import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { RedditService } from '../reddit.service';
import { ChildData, Reddit } from '../reddit.types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { YouTubePlayer } from '@angular/youtube-player';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, filter, repeat, expand, takeUntil, takeWhile, take, startWith, tap, throttleTime, finalize } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material/select';
import { StorageService } from '../storage.service';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { BreakpointObserver } from '@angular/cdk/layout';

export interface RedditVideo extends ChildData, RedditVideoStorage {
  playing?: boolean;
}

export interface RedditVideoStorage {
  youtubeId: string;
  watched?: boolean;
  finished?: boolean;
}

@Component({
  selector: 'app-watch',
  templateUrl: './watch.component.html',
  styleUrls: ['./watch.component.scss']
})
export class WatchComponent implements OnInit {

  constructor(
    private redditService: RedditService,
    private snackBar: MatSnackBar,
    private storageService: StorageService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver.isMatched('(max-width: 800px)');
    this.breakpointObserver.observe(['(max-width: 800px)']).subscribe((result) => {
      this.isMobile = !result.matches;
      this.toolbarBottom = result.matches;
    });
  }
  currentVideo: RedditVideo;
  currentSubreddit = 'videos';
  customSubreddit = false;
  subreddits: string[] = ['videos', 'music', 'listen', 'volkswagen', 'audi', 'funny'];
  videos: RedditVideo[] = [];
  storedVideos: RedditVideoStorage[];
  @ViewChild(YouTubePlayer) youtubePlayer: YouTubePlayer;
  toolbarBottom = false;
  isMobile;
  @ViewChild('contextMenuClick') contextMenu: MatMenuTrigger;
  @ViewChild('saveMenuClick') saveMenu: MatMenuTrigger;


  contextMenuPosition = { x: '0px', y: '0px' };
  @HostListener('window:keydown', ['$event']) onKeydownEvent(event: KeyboardEvent): void {
    switch (event.key) {
      case ' ':
        this.currentVideo.playing ? this.pauseVideo() : this.playVideo();
        break;
      case 'ArrowUp':
        this.youtubePlayer.setVolume(this.youtubePlayer.getVolume() + 10);
        break;
      case 'ArrowDown':
        this.youtubePlayer.setVolume(this.youtubePlayer.getVolume() - 10);
        break;
      case 'ArrowLeft':
        if (event.shiftKey) {
          this.playPreviousVideo();
        } else {
          this.youtubePlayer.seekTo(this.youtubePlayer.getCurrentTime() - 15, true);
        }
        break;
      case 'ArrowRight':
        if (event.shiftKey) {
          this.playNextVideo();
        } else {
          this.youtubePlayer.seekTo(this.youtubePlayer.getCurrentTime() + 15, true);
        }
        break;
    }
  }

  ngOnInit(): void {
    this.initYouTube();
    this.storedVideos = this.storageService.getVideos();
    this.changeSubreddit('videos').subscribe();
  }

  getVideos(subreddit: string, after?: string): Observable<RedditVideo[]> {
    const video = [];
    return this.redditService.getHot(subreddit, after).pipe(
      map((hotVids) => {
        const videos: RedditVideo[] = [];
        hotVids.data.children.forEach((child) => {
          if (child.data.is_video || child.data.media) {
            const youtubeId = youtube_parser(child.data.url);
            if (youtubeId) {
              videos.push({ youtubeId, ...child.data });
            }
          }
        });
        return videos;
      })
    );
  }

  loadMore(): void {
    const lastVideo = this.videos[this.videos.length - 1];
    if (lastVideo) {
      this.getVideos(this.currentSubreddit, lastVideo.name).subscribe((videos) => this.videos = this.videos.concat(videos));
    }
  }

  selectVideo(id: string): void {
    const foundVideo = this.videos.find((vid) => vid.youtubeId === id);
    if (foundVideo) {
      if (this.currentVideo) {
        this.currentVideo.playing = false;
        this.currentVideo.watched = true;
      }

      this.currentVideo = foundVideo;
      this.youtubePlayer.videoId = this.currentVideo.youtubeId;
      this.openSnackBar(`Playing - ${this.currentVideo.title}`);
      this.youtubePlayer.playVideo();
      this.currentVideo.playing = true;
      this.currentVideo.watched = true;
      this.storageService.storeVideos(this.videos.map((v) => {
        return {
          youtubeId: v.youtubeId,
          watched: v.watched,
          finished: v.finished
        };
      }));
    } else {
      this.openSnackBar(`Failed to selected video ${id}`);
    }
  }

  changeSubreddit(subreddit: string): Observable<RedditVideo[]> {
    let attempts = 0;
    const lastVideoName = this.videos[this.videos.length - 1]?.name;
    return this.getVideos(subreddit).pipe(
      expand((v) => this.getVideos(subreddit, lastVideoName)),
      tap(() => attempts++),
      takeWhile(() => this.videos.length < 30 && attempts < 10)
    ).pipe(
      tap((videos) => this.videos = this.videos.concat(videos)),
      finalize(() => {
        this.videos.forEach((video) => {
          const foundStored = this.storedVideos.find((v) => v.youtubeId === video.youtubeId);
          Object.assign(video, foundStored);
        });
        const found = this.videos.find((v) => !v.watched);
        this.selectVideo(found?.youtubeId || this.videos[0].youtubeId);
      })
    );
  }

  openSnackBar(message: string): void {
    this.snackBar.open(message, 'DISMISS', {
      duration: 3333,
      verticalPosition: this.toolbarBottom ? 'top' : 'bottom'
    });
  }

  setCustomSubreddit(e): void {
    this.customSubreddit = true;
    e.preventDefault();
  }

  onSubredditChange(event: MatSelectChange): void {
    this.videos = [];
    this.currentSubreddit = event.value;
    this.changeSubreddit(this.currentSubreddit).subscribe();
  }

  onPlayerReady(event: YT.PlayerEvent): void {
    event.target.playVideo();
  }

  onPlayerStateChange(event: YT.OnStateChangeEvent): void {
    switch (event.data) {
      case YT.PlayerState.PLAYING:
        break;
      case YT.PlayerState.UNSTARTED:
        break;
      case YT.PlayerState.ENDED:
        this.currentVideo.finished = true;
        this.playNextVideo();
        break;
      default:
        break;
    }
  }

  markVideo(videoId: RedditVideo, state: string): void {
    switch (state) {
      case 'UNWATCHED':
        videoId.watched = false;
        videoId.finished = false;
        break;
      case 'WATCHED':
        videoId.watched = true;
        videoId.finished = false;
        break;
      case 'UNFINISHED':
        videoId.watched = true;
        videoId.finished = false;
        break;
      case 'FINISHED':
        videoId.watched = true;
        videoId.finished = true;
        break;
    }
  }

  playVideo(): void {
    this.currentVideo.playing = true;
    this.youtubePlayer.playVideo();
  }

  pauseVideo(): void {
    this.currentVideo.playing = false;
    this.youtubePlayer.pauseVideo();
  }

  playPreviousVideo(): void {
    const foundIndex = this.videos.findIndex((v) => this.currentVideo.youtubeId === v.youtubeId);
    const nextVideo = this.videos[foundIndex - 1];
    if (nextVideo) {
      this.selectVideo(nextVideo.youtubeId);
    }
  }

  playNextVideo(): void {
    const foundIndex = this.videos.findIndex((v) => this.currentVideo.youtubeId === v.youtubeId);
    const nextVideo = this.videos[foundIndex + 1];
    if (nextVideo) {
      this.selectVideo(nextVideo.youtubeId);
    }
  }

  private initYouTube(): void {
    // This code loads the IFrame Player API code asynchronously, according to the instructions at
    // https://developers.google.com/youtube/iframe_api_reference#Getting_Started
    const tag = document.createElement('script');

    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }

  saveVideos(): void {
    this.openSnackBar('Saved your 🎥 history');
    this.storageService.storeVideos(this.videos.map((v) => {
      return {
        youtubeId: v.youtubeId,
        playing: v.playing,
        watched: v.watched,
        finished: v.finished,
      };
    }));
  }

  clearWatchHistory(): void {
    this.videos.forEach((v) => {
      v.playing = false;
      v.watched = false;
      v.finished = false;
    });
    this.storageService.storeVideos([]);
  }

  openContextMenu(event: MouseEvent, item: RedditVideo): void {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { item };
    this.contextMenu._openedBy = 'mouse';
    this.contextMenu.openMenu();
  }

}

function youtube_parser(url): string {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}
