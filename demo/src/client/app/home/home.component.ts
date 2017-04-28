import { Component, OnInit } from '@angular/core';
import { NameListService } from '../shared/name-list/name-list.service';

import {
    InfinityDataProvider,
    DefaultInfinityDataSource,
    InfinityData,
    InfinityDataSource,
    InfinityDataSourceFactory
} from "ng2-infinity-grid/index";

class DataProvider implements InfinityDataProvider<string> {

  private buffer: string[] = [];

  constructor() {
    for (let i = 0; i < 1000000; i++) {
      this.buffer[i] = 'test-' + i;
    }
  }

  /**
   * @override
   */
  public getFullSize(): number {
    return this.buffer.length;
  }

  /**
   * @override
   */
  public fetch(startIndex: number, endIndex: number): Promise<InfinityData<string>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          fullSize: this.getFullSize(),
          data: this.buffer.slice(startIndex, endIndex + 1)
        });
      }, 500);
    });
  }
}

/**
 * This class represents the lazy loaded HomeComponent.
 */
@Component({
  moduleId: module.id,
  selector: 'sd-home',
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.css'],
})
export class HomeComponent implements OnInit {

  newName: string = '';
  errorMessage: string;
  names: any[] = [];
  dataSource: InfinityDataSource<string>;

  /**
   * Creates an instance of the HomeComponent with the injected
   * NameListService.
   *
   * @param {NameListService} nameListService - The injected NameListService.
   */
  constructor(public nameListService: NameListService,
              infinityDataSourceFactory: InfinityDataSourceFactory) {
    this.dataSource = infinityDataSourceFactory.getInstance(new DataProvider());
  }

  /**
   * Get the names OnInit
   */
  ngOnInit() {
    this.getNames();
  }

  /**
   * Handle the nameListService observable
   */
  getNames() {
    this.nameListService.get()
      .subscribe(
        names => this.names = names,
        error => this.errorMessage = <any>error
      );
  }

  /**
   * Pushes a new name onto the names array
   * @return {boolean} false to prevent default form submit behavior to refresh the page.
   */
  addName(): boolean {
    // TODO: implement nameListService.post
    this.names.push(this.newName);
    this.newName = '';
    return false;
  }

}
