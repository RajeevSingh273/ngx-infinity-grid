import { Component, OnInit } from '@angular/core';
import { NameListService } from '../shared/name-list/name-list.service';

import {
    InfinityPage,
    InfinityPageData,
} from "ng2-infinity-grid/index";

class DataProvider {

  private buffer:string[] = [];

  constructor() {
    for (let i = 0; i < 100000; i++) {
      this.buffer[i] = 'test-' + i;
    }
  }

  /**
   * @override
   */
  public fetch(page: InfinityPage): Promise<InfinityPageData<string>> {
    return new Promise<InfinityPageData<string>>((resolve) => {
      setTimeout(() => {
        resolve({
          startIndex: page.startIndex,
          rawData: this.buffer.slice(page.startIndex, page.endIndex + 1),
          totalLength: this.buffer.length
        });
      }, 3000);
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
  private dataProvider: DataProvider;
  private pageData: InfinityPageData<string>;

  /**
   * Creates an instance of the HomeComponent with the injected
   * NameListService.
   *
   * @param {NameListService} nameListService - The injected NameListService.
   */
  constructor(public nameListService: NameListService) {
    this.dataProvider = new DataProvider();
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

  private onFetchPage(page: InfinityPage) {
    // Flux action should be started here
    // Local pageData object should be updated during Flux-lifecycle
    // When long asynchronous request has been started, we should show loading rows in grid
    this.pageData = {
      startIndex: page.startIndex,
      endIndex: page.endIndex
    };

    if (!page.isReady) {
      this.dataProvider.fetch(page)
          .then((pageData: InfinityPageData<string>) => {
            if (pageData.startIndex === this.pageData.startIndex) {
              // The promise is not cancellable
              // https://github.com/tc39/proposal-cancelable-promises
              // We should check the current and previous indexes

              this.pageData = pageData;
            }
          });
    }
  }
}
