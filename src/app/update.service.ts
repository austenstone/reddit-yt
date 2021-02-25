import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate, UpdateAvailableEvent } from '@angular/service-worker';
import { first } from 'rxjs/operators';
import { concat, interval } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {

  constructor(
    private updates: SwUpdate,
    private snackBar: MatSnackBar,
    private appRef: ApplicationRef
  ) {
    if (!updates.isEnabled) {
      console.log('Your browser does not support service workers.');
      return;
    }
    // Allow the app to stabilize first, before starting polling for updates with `interval()`.
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    this.updates.available.subscribe((evt: UpdateAvailableEvent) => {
      this.snackBar.open('Update available!', 'Reload', { duration: 30000 })
        .onAction().subscribe(() => updates.activateUpdate().then(() => window.location.reload()));
    });

    this.updates.activated.subscribe(event => {
      this.snackBar.open(`Updated ${event.previous} to ${event.current} !`, 'OK', { duration: 30000 });
    });

    everySixHoursOnceAppIsStable$.subscribe(() => updates.checkForUpdate());
  }
}
