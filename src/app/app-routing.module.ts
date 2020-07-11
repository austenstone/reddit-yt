import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { WatchComponent } from './watch/watch.component';


const routes: Routes = [
  { path: 'watch', component: WatchComponent },
  { path: '**', redirectTo: 'watch' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
