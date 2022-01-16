import { Component, OnInit, ViewChild, HostListener, Inject } from '@angular/core';
import { RedditService } from '../reddit.service';
import { ChildData } from '../reddit.types';
import { MatSnackBar } from '@angular/material/snack-bar';
import { YouTubePlayer } from '@angular/youtube-player';
import { Observable } from 'rxjs';
import { map, expand, takeWhile, tap, finalize } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material/select';
import { StorageService } from '../storage.service';
import { MatMenuTrigger } from '@angular/material/menu';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDrawer } from '@angular/material/sidenav';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface RedditVideo extends ChildData, RedditVideoStorage {
  playing?: boolean;
}

export interface RedditVideoStorage {
  youtubeId: string;
  watched?: boolean;
  finished?: boolean;
}

export interface RedditSubreddit {
  name: string;
  img?: string;
}

@Component({
  selector: 'app-watch',
  templateUrl: './watch.component.html',
  styleUrls: ['./watch.component.scss']
})
export class WatchComponent implements OnInit {
  @ViewChild(YouTubePlayer) youtubePlayer: YouTubePlayer;
  @ViewChild('contextMenuClick') contextMenu: MatMenuTrigger;
  @ViewChild('saveMenuClick') saveMenu: MatMenuTrigger;
  @ViewChild('drawer') drawer: MatDrawer;
  currentVideo: RedditVideo;
  currentSubreddit: RedditSubreddit;
  customSubreddit = false;
  customSubredditName = '';
  subreddits: RedditSubreddit[] = [{ name: 'videos' }, { name: 'all' }, { name: 'music' }, { name: 'ted' }, { name: 'sports' }];
  videos: RedditVideo[] = [];
  storedVideos: RedditVideoStorage[];
  listingType = 'hot';
  toolbarBottom = false;
  isMobile;
  contextMenuPosition = { x: '0px', y: '0px' };
  dialogRef: MatDialogRef<VideoInfoDialogComponent>;
  iframe: any;

  constructor(
    private redditService: RedditService,
    private snackBar: MatSnackBar,
    private storageService: StorageService,
    private breakpointObserver: BreakpointObserver,
    public dialog: MatDialog
  ) {
    this.isMobile = this.breakpointObserver.isMatched('(max-width: 800px)');
    this.breakpointObserver.observe(['(max-width: 800px)']).subscribe((result) => {
      this.isMobile = result.matches;
      this.toolbarBottom = result.matches;
    });
  }

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
      case 'r':
        this.youtubePlayer.seekTo(0, true);
        break;
      case 'f':
        this.playFullscreen();
        break;
      case 'i':
        if (!this.dialogRef) {
          this.openVideoInfo();
        } else {
          this.dialogRef.close();
        }
        break;
    }
  }

  ngOnInit(): void {
    this.currentSubreddit = this.subreddits.find((sr) => sr);
    this.initYouTube();
    this.storedVideos = this.storageService.getVideos();
    this.changeSubreddit(this.currentSubreddit?.name)?.subscribe((video) => {
      const found = video.find((v) => {
        return v.watched === undefined || v.watched === false;
      });
      this.selectVideo(found?.youtubeId || this.videos[0].youtubeId);
    });

    // this.redditService.getTrendingSubreddits().subscribe((subreddits) => {
    // });

    this.redditService.getPopularSubreddits().subscribe((subreddits) => {
      subreddits.data.children.forEach((s) => {
        this.subreddits.push({
          name: s.data.display_name,
          img: s.data.icon_img || s.data.header_img
        });
      });
    });

    this.subreddits.forEach((subreddit) => {
      this.redditService.getSubredditInfo(subreddit.name).subscribe((r) => {
        const foundSubreddit = this.subreddits.find((s) => s.name === subreddit.name);
        foundSubreddit.img = r.data.icon_img || r.data.header_img;
      });
    });

  }

  getVideos(subreddit: string, after?: string): Observable<RedditVideo[]> {
    return this.redditService.getRedditListing(subreddit, this.listingType, after).pipe(
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
    if (this.videos) {
      const lastVideo = this.videos[this.videos?.length - 1];
      if (lastVideo) {
        this.getVideos(this.currentSubreddit.name, lastVideo.name).subscribe((videos) => {
          this.videos = this.videos ? this.videos.concat(videos) : videos
        });
      }
    }
  }

  selectVideo(id: string): void {
    console.warn('select', id);
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
      // this.currentVideo.playing = true;
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

    if (this.isMobile) {
      this.drawer.close();
    }
  }

  changeSubreddit(subreddit: string): Observable<RedditVideo[]> {
    let attempts = 0;
    let lastVideoName;
    if (this.videos) {
      lastVideoName = this.videos[this.videos.length - 1]?.name;
    }
    const foundSubreddit = this.subreddits.find((s) => s.name === subreddit);
    return this.getVideos(subreddit).pipe(
      expand(() => this.getVideos(subreddit, lastVideoName)),
      tap(() => attempts++),
      takeWhile((v) => v.length > 0 && this.videos?.length < 30 && attempts < 10)
    ).pipe(
      tap((videos) => this.videos = this.videos ? this.videos.concat(videos) : videos),
      finalize(() => {
        if (this.videos?.length < 1) {
          this.openSnackBar(`No ${this.listingType} videos for r/${subreddit} ❌`);
        }
        this.videos?.forEach((video) => {
          const foundStored = this.storedVideos.find((v) => v.youtubeId === video.youtubeId);
          Object.assign(video, foundStored);
        });
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
    this.currentSubreddit = {
      name: 'custom',
      img: null
    }
    e.preventDefault();
  }

  onListingTypeChange(event: MatSelectChange): void {
    this.videos = [];
    if (this.currentSubreddit.name) {
      this.changeSubreddit(this.currentSubreddit.name).subscribe();
    } else {
      this.snackBar.open('No subreddit name.');
    }
  }

  onCustomSubredditChange2(event: Event): void {
    return this.onCustomSubredditChange((event.target as HTMLInputElement).value);
  }

  onCustomSubredditChange(subredditName: string): void {
    const subreddit: RedditSubreddit = {
      name: subredditName
    }
    if (subreddit) {
      this.videos = [];
      this.currentSubreddit = subreddit;
      this.changeSubreddit(this.currentSubreddit.name).subscribe();
    }
  }

  onSubredditChange(subreddit: RedditSubreddit): void {
    if (subreddit) {
      this.videos = [];
      this.currentSubreddit = subreddit;
      this.changeSubreddit(this.currentSubreddit.name).subscribe();
    }
    this.customSubreddit = this.currentSubreddit.name === 'custom';
  }

  onPlayerReady(event: YT.PlayerEvent): void {
    event.target.playVideo();
    this.iframe = event.target;
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
    setTimeout(() => this.playVideo(), 100)
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

  openVideoInfo(): void {
    if (!this.dialogRef) {
      this.dialogRef = this.dialog.open(VideoInfoDialogComponent, {
        width: '350px',
        data: { video: this.currentVideo }
      });
      this.dialogRef.afterClosed().subscribe(() => this.dialogRef = null);
    }
  }

  playFullscreen() {
    this.youtubePlayer.playVideo();//won't work on mobile
    console.log('iframe', this.iframe);
    var requestFullScreen = this.iframe.h.requestFullScreen || this.iframe.h.mozRequestFullScreen || this.iframe.h.webkitRequestFullScreen;
    if (requestFullScreen) {
      requestFullScreen.bind(this.iframe.h)();
    }
  }
}

@Component({
  selector: 'app-video-info-dialog',
  templateUrl: 'video.info.dialog.html',
  styleUrls: ['./video.info.dialog.scss']
})
export class VideoInfoDialogComponent {
  video: RedditVideo;

  constructor(
    public dialogRef: MatDialogRef<VideoInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { video: RedditVideo }) {
    this.video = this.data.video;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}

function youtube_parser(url): string {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}
