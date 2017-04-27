import { NgModule } from '@angular/core';
import {InfinityGridModule} from "ng2-infinity-grid/index";

import { HomeComponent } from './home.component';
import { HomeRoutingModule } from './home-routing.module';
import { SharedModule } from '../shared/shared.module';
import { NameListService } from '../shared/name-list/name-list.service';

@NgModule({
  imports: [HomeRoutingModule, SharedModule, InfinityGridModule.forRoot()],
  declarations: [HomeComponent],
  exports: [HomeComponent],
  providers: [NameListService]
})
export class HomeModule { }
